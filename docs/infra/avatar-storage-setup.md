# Avatar storage (S3) setup — run once per environment

Dedicated **private** avatars bucket on the **existing GC AWS account** — the
same account as title assets (`gc-content-assets-dev` / `gc-content-assets-prod`).
This is **not** a prefix on the title-asset bucket. Title objects stay in
`S3_BUCKET` under `orgs/<org>/titles/...`. Faces never go there and are never
served through title CloudFront.

Do **not** apply this from CI. Founder-executed only. No SQL. No Supabase
Storage. No public URLs. No second AWS account.

Intended bucket names (same account, `us-east-1`):

| Environment | `S3_AVATARS_BUCKET` |
| --- | --- |
| Production | `gc-avatars-prod` |
| Dev / local / preview | `gc-avatars-dev` |

Object key (only legal prefix): `avatars/{user-id}/avatar`
Example: `avatars/11111111-1111-4111-8111-111111111111/avatar`

Prereqs: `aws` CLI authenticated to the GC AWS account; same region as title
assets (e.g. us-east-1).

    export AWS_REGION=us-east-1
    export AVATARS_BUCKET=gc-avatars-prod   # or gc-avatars-dev

1) Create the bucket + block all public access:

    aws s3api create-bucket --bucket "$AVATARS_BUCKET" --region "$AWS_REGION" \
      $( [ "$AWS_REGION" = us-east-1 ] || echo --create-bucket-configuration LocationConstraint=$AWS_REGION )
    aws s3api put-public-access-block --bucket "$AVATARS_BUCKET" \
      --public-access-block-configuration BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true

Do not attach a public bucket policy. Do not enable a website. Do not add this
bucket as a CloudFront origin.

2) Least-privilege on the **existing** app IAM user (`gc-assets-app`) — same
credentials the title-asset path already uses. Pre-deploy, before the image
recheck: GetObject, PutObject, DeleteObject, GetObjectTagging,
PutObjectTagging, and DeleteObjectTagging on `avatars/*`, plus ListBucket
on this bucket with no `s3:prefix` condition. HeadObject and GetObject on a
missing key return 404 only when ListBucket applies to that request. A
prefix condition does not apply to Head or Get, so S3 answers 403 and a
missing face is not `no_object`. This bucket holds only faces, so the list
is the avatar set. Do not grant `/*` on this bucket. Do not grant this
prefix on `S3_BUCKET`.

Pre-deploy check, before the recheck and before the env var below. Head
a missing `avatars/` key. It must return 404. 403 means the prefix
condition is still on the ListBucket statement, and a missing face is not
`no_object`. Do not continue while the head returns 403.

    aws s3api head-object --bucket "$AVATARS_BUCKET" \
      --key "avatars/00000000-0000-0000-0000-000000000000/missing"

Remove photo deletes only the exact keys that read named. It reads
`profiles.avatar_key` again before each delete and does not delete the key
that read names. It does not list a prefix. Recheck and quarantine copies
are tagged `gc-hold=quarantine` on the put or copy. The app then sends
DeleteObjectTagging and confirms with GetObjectTagging that no `gc-hold`
tag remains. The pointer moves only after that confirm. The 30-day
expiry rule is step 3 of this file, before the env var. A prefix of
`avatars/` would expire live faces. The tag is the rule.

    aws iam put-user-policy --user-name gc-assets-app --policy-name gc-avatars-s3 --policy-document '{
      "Version": "2012-10-17",
      "Statement": [
        {
          "Effect": "Allow",
          "Action": ["s3:GetObject","s3:PutObject","s3:DeleteObject","s3:PutObjectTagging","s3:DeleteObjectTagging","s3:GetObjectTagging"],
          "Resource": "arn:aws:s3:::'"$AVATARS_BUCKET"'/avatars/*"
        },
        {
          "Effect": "Allow",
          "Action": ["s3:ListBucket"],
          "Resource": "arn:aws:s3:::'"$AVATARS_BUCKET"'"
        }
      ]
    }'

The app PUTs server-side. Browser CORS on this bucket is not required.

3) Pre-deploy gate, before the env var in the next step. Quarantine copies
have no other cleanup. This 30-day rule on tag `gc-hold=quarantine` is the
only one. A prefix of `avatars/` would expire live faces. The rule replaces
the whole lifecycle configuration: merge any rule already on the bucket
before sending it. Do not run it from CI. Do not point it at the title-asset
bucket.

```sh
cat > /tmp/avatars-lifecycle.json <<'JSON'
{
  "Rules": [
    {
      "ID": "avatars-quarantine-30d",
      "Filter": { "Tag": { "Key": "gc-hold", "Value": "quarantine" } },
      "Status": "Enabled",
      "Expiration": { "Days": 30 }
    }
  ]
}
JSON
aws s3api put-bucket-lifecycle-configuration \
  --bucket "$AVATARS_BUCKET" \
  --lifecycle-configuration file:///tmp/avatars-lifecycle.json
```

Read-only check. Stop when rule `avatars-quarantine-30d` is missing or not
Enabled. Do not set `S3_AVATARS_BUCKET` until this returns that rule.

    aws s3api get-bucket-lifecycle-configuration --bucket "$AVATARS_BUCKET" \
      --query "Rules[?ID=='avatars-quarantine-30d' && Status=='Enabled']"

4) Set env vars (server-only) locally (`.env.local`) and in Vercel (all
environments). Add the **name** to `.env.example` (agents cannot edit
`.env.*`):

    S3_AVATARS_BUCKET=gc-avatars-prod   # or gc-avatars-dev

Reuse existing `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`.
Never `NEXT_PUBLIC_`. Never point `S3_AVATARS_BUCKET` at `S3_BUCKET`.

Code: `src/lib/s3-avatars.ts` reads `S3_AVATARS_BUCKET` and refuses to run
when it equals `S3_BUCKET`. Display is a short-lived signed GET (5 minutes).
