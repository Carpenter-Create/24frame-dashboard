export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      account_invites: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          created_at: string
          custom_role_id: string | null
          email: string
          entity_scope: Database["public"]["Enums"]["entity_scope"]
          expires_at: string
          id: string
          invited_by: string
          kind: Database["public"]["Enums"]["account_invite_kind"]
          org_id: string | null
          org_name: string | null
          revoked_at: string | null
          role: Database["public"]["Enums"]["org_role"] | null
          status: Database["public"]["Enums"]["account_invite_status"]
          tier: Database["public"]["Enums"]["tier_enum"] | null
          token_hash: string
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          custom_role_id?: string | null
          email: string
          entity_scope?: Database["public"]["Enums"]["entity_scope"]
          expires_at: string
          id?: string
          invited_by: string
          kind: Database["public"]["Enums"]["account_invite_kind"]
          org_id?: string | null
          org_name?: string | null
          revoked_at?: string | null
          role?: Database["public"]["Enums"]["org_role"] | null
          status?: Database["public"]["Enums"]["account_invite_status"]
          tier?: Database["public"]["Enums"]["tier_enum"] | null
          token_hash: string
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          custom_role_id?: string | null
          email?: string
          entity_scope?: Database["public"]["Enums"]["entity_scope"]
          expires_at?: string
          id?: string
          invited_by?: string
          kind?: Database["public"]["Enums"]["account_invite_kind"]
          org_id?: string | null
          org_name?: string | null
          revoked_at?: string | null
          role?: Database["public"]["Enums"]["org_role"] | null
          status?: Database["public"]["Enums"]["account_invite_status"]
          tier?: Database["public"]["Enums"]["tier_enum"] | null
          token_hash?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "account_invites_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      assets: {
        Row: {
          bytes: number
          content_hash: string
          content_type: string | null
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
          id: string
          kind: Database["public"]["Enums"]["asset_kind"]
          org_id: string
          original_filename: string | null
          provided_by: string | null
          purged_at: string | null
          received_at: string
          storage_key: string
          title_id: string
        }
        Insert: {
          bytes: number
          content_hash: string
          content_type?: string | null
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          kind: Database["public"]["Enums"]["asset_kind"]
          org_id: string
          original_filename?: string | null
          provided_by?: string | null
          purged_at?: string | null
          received_at?: string
          storage_key: string
          title_id: string
        }
        Update: {
          bytes?: number
          content_hash?: string
          content_type?: string | null
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["asset_kind"]
          org_id?: string
          original_filename?: string | null
          provided_by?: string | null
          purged_at?: string | null
          received_at?: string
          storage_key?: string
          title_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "assets_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assets_title_id_fkey"
            columns: ["title_id"]
            isOneToOne: false
            referencedRelation: "titles"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          actor: string | null
          after: Json | null
          at: string
          before: Json | null
          entity: string
          entity_id: string | null
          id: string
          org_id: string | null
        }
        Insert: {
          action: string
          actor?: string | null
          after?: Json | null
          at?: string
          before?: Json | null
          entity: string
          entity_id?: string | null
          id?: string
          org_id?: string | null
        }
        Update: {
          action?: string
          actor?: string | null
          after?: Json | null
          at?: string
          before?: Json | null
          entity?: string
          entity_id?: string | null
          id?: string
          org_id?: string | null
        }
        Relationships: []
      }
      contract_assents: {
        Row: {
          agreed_at: string
          content_hash: string
          created_at: string
          id: string
          ip: unknown
          org_id: string
          source_document_id: string
          terms_version: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          agreed_at?: string
          content_hash: string
          created_at?: string
          id?: string
          ip?: unknown
          org_id: string
          source_document_id: string
          terms_version: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          agreed_at?: string
          content_hash?: string
          created_at?: string
          id?: string
          ip?: unknown
          org_id?: string
          source_document_id?: string
          terms_version?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contract_assents_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_assents_source_document_id_fkey"
            columns: ["source_document_id"]
            isOneToOne: false
            referencedRelation: "source_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_terms: {
        Row: {
          created_at: string
          effective_from: string
          effective_to: string | null
          expires_at: string
          id: string
          org_id: string
          revenue_share_rate_bp: number
          source_document_id: string | null
          term_length_months: number
          tier: Database["public"]["Enums"]["tier_enum"]
          trigger: Database["public"]["Enums"]["term_trigger_enum"]
        }
        Insert: {
          created_at?: string
          effective_from: string
          effective_to?: string | null
          expires_at: string
          id?: string
          org_id: string
          revenue_share_rate_bp: number
          source_document_id?: string | null
          term_length_months: number
          tier: Database["public"]["Enums"]["tier_enum"]
          trigger: Database["public"]["Enums"]["term_trigger_enum"]
        }
        Update: {
          created_at?: string
          effective_from?: string
          effective_to?: string | null
          expires_at?: string
          id?: string
          org_id?: string
          revenue_share_rate_bp?: number
          source_document_id?: string | null
          term_length_months?: number
          tier?: Database["public"]["Enums"]["tier_enum"]
          trigger?: Database["public"]["Enums"]["term_trigger_enum"]
        }
        Relationships: [
          {
            foreignKeyName: "contract_terms_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_terms_source_document_id_fkey"
            columns: ["source_document_id"]
            isOneToOne: false
            referencedRelation: "source_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_conversation_messages: {
        Row: {
          body: string
          conversation_id: string
          created_at: string
          follow: string | null
          id: string
          lead: string | null
          org_id: string
          role: Database["public"]["Enums"]["conversation_role"]
          thumbs: Database["public"]["Enums"]["conversation_thumb"] | null
        }
        Insert: {
          body: string
          conversation_id: string
          created_at?: string
          follow?: string | null
          id?: string
          lead?: string | null
          org_id: string
          role: Database["public"]["Enums"]["conversation_role"]
          thumbs?: Database["public"]["Enums"]["conversation_thumb"] | null
        }
        Update: {
          body?: string
          conversation_id?: string
          created_at?: string
          follow?: string | null
          id?: string
          lead?: string | null
          org_id?: string
          role?: Database["public"]["Enums"]["conversation_role"]
          thumbs?: Database["public"]["Enums"]["conversation_thumb"] | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_conversation_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "ai_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_conversation_messages_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_conversations: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          org_id: string
          pinned_at: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          org_id: string
          pinned_at?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          org_id?: string
          pinned_at?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_conversations_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      app_settings: {
        Row: {
          gamification_enabled: boolean
          heatmap_public: boolean
          id: boolean
          leaderboard_public: boolean
          signup_mode: string
          updated_at: string
        }
        Insert: {
          gamification_enabled?: boolean
          heatmap_public?: boolean
          id?: boolean
          leaderboard_public?: boolean
          signup_mode?: string
          updated_at?: string
        }
        Update: {
          gamification_enabled?: boolean
          heatmap_public?: boolean
          id?: boolean
          leaderboard_public?: boolean
          signup_mode?: string
          updated_at?: string
        }
        Relationships: []
      }
      capabilities: {
        Row: {
          key: string
          label: string
          min_level: number | null
          min_tier_rank: number
          staff_only: boolean
        }
        Insert: {
          key: string
          label: string
          min_level?: number | null
          min_tier_rank?: number
          staff_only?: boolean
        }
        Update: {
          key?: string
          label?: string
          min_level?: number | null
          min_tier_rank?: number
          staff_only?: boolean
        }
        Relationships: []
      }
      levels: {
        Row: {
          level: number
          min_points: number
          title: string | null
        }
        Insert: {
          level: number
          min_points: number
          title?: string | null
        }
        Update: {
          level?: number
          min_points?: number
          title?: string | null
        }
        Relationships: []
      }
      point_events: {
        Row: {
          actor_id: string | null
          created_at: string
          delta: number
          id: string
          reason: Database["public"]["Enums"]["point_reason"]
          source_id: string | null
          source_type: string | null
          user_id: string
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          delta: number
          id?: string
          reason: Database["public"]["Enums"]["point_reason"]
          source_id?: string | null
          source_type?: string | null
          user_id: string
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          delta?: number
          id?: string
          reason?: Database["public"]["Enums"]["point_reason"]
          source_id?: string | null
          source_type?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "point_events_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "point_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          app_role: Database["public"]["Enums"]["app_role"]
          avatar_key: string | null
          bio: string | null
          birth_date: string | null
          cover_crop: Json | null
          cover_key: string | null
          cover_source_key: string | null
          crafts: string[]
          created_at: string
          credits: Json
          deactivated_at: string | null
          deletion_due_at: string | null
          deletion_requested_at: string | null
          discoverable: boolean
          display_name: string
          email_verified_at: string | null
          embedding: string | null
          erased_at: string | null
          field_visibility: Json
          follower_count: number
          handle: string
          id: string
          imdb_url: string | null
          is_high_fanout: boolean
          last_active_at: string | null
          legal_hold: boolean
          level: number
          location_city: string | null
          location_country: string | null
          location_region: string | null
          markets: string[]
          points_total: number
          primary_role: string | null
          status: Database["public"]["Enums"]["account_status"]
          timezone: string
          topics: string[]
          trust_state: Database["public"]["Enums"]["trust_state"]
          website_url: string | null
          welcome_video_key: string | null
          welcome_mux_asset_id: string | null
          welcome_mux_playback_id: string | null
          welcome_mux_upload_id: string | null
        }
        Insert: {
          app_role?: Database["public"]["Enums"]["app_role"]
          avatar_key?: string | null
          bio?: string | null
          birth_date?: string | null
          cover_crop?: Json | null
          cover_key?: string | null
          cover_source_key?: string | null
          crafts?: string[]
          created_at?: string
          credits?: Json
          deactivated_at?: string | null
          deletion_due_at?: string | null
          deletion_requested_at?: string | null
          discoverable?: boolean
          display_name: string
          email_verified_at?: string | null
          embedding?: string | null
          erased_at?: string | null
          field_visibility?: Json
          follower_count?: number
          handle: string
          id: string
          imdb_url?: string | null
          is_high_fanout?: boolean
          last_active_at?: string | null
          legal_hold?: boolean
          level?: number
          location_city?: string | null
          location_country?: string | null
          location_region?: string | null
          markets?: string[]
          points_total?: number
          primary_role?: string | null
          status?: Database["public"]["Enums"]["account_status"]
          timezone?: string
          topics?: string[]
          trust_state?: Database["public"]["Enums"]["trust_state"]
          website_url?: string | null
          welcome_video_key?: string | null
          welcome_mux_asset_id?: string | null
          welcome_mux_playback_id?: string | null
          welcome_mux_upload_id?: string | null
        }
        Update: {
          app_role?: Database["public"]["Enums"]["app_role"]
          avatar_key?: string | null
          bio?: string | null
          birth_date?: string
          cover_crop?: Json | null
          cover_key?: string | null
          cover_source_key?: string | null
          crafts?: string[]
          created_at?: string
          credits?: Json
          deactivated_at?: string | null
          deletion_due_at?: string | null
          deletion_requested_at?: string | null
          discoverable?: boolean
          display_name?: string
          email_verified_at?: string | null
          embedding?: string | null
          erased_at?: string | null
          field_visibility?: Json
          follower_count?: number
          handle?: string
          id?: string
          imdb_url?: string | null
          is_high_fanout?: boolean
          last_active_at?: string | null
          legal_hold?: boolean
          level?: number
          location_city?: string | null
          location_country?: string | null
          location_region?: string | null
          markets?: string[]
          points_total?: number
          primary_role?: string | null
          status?: Database["public"]["Enums"]["account_status"]
          timezone?: string
          topics?: string[]
          trust_state?: Database["public"]["Enums"]["trust_state"]
          website_url?: string | null
          welcome_video_key?: string | null
          welcome_mux_asset_id?: string | null
          welcome_mux_playback_id?: string | null
          welcome_mux_upload_id?: string | null
        }
        Relationships: []
      }
      groups: {
        Row: {
          cover_key: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          member_count: number
          min_level: number | null
          min_tier_rank: number
          name: string
          slug: string
          status: Database["public"]["Enums"]["group_status"]
          visibility: Database["public"]["Enums"]["group_visibility"]
        }
        Insert: {
          cover_key?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          member_count?: number
          min_level?: number | null
          min_tier_rank?: number
          name: string
          slug: string
          status?: Database["public"]["Enums"]["group_status"]
          visibility?: Database["public"]["Enums"]["group_visibility"]
        }
        Update: {
          cover_key?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          member_count?: number
          min_level?: number | null
          min_tier_rank?: number
          name?: string
          slug?: string
          status?: Database["public"]["Enums"]["group_status"]
          visibility?: Database["public"]["Enums"]["group_visibility"]
        }
        Relationships: [
          {
            foreignKeyName: "groups_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      group_members: {
        Row: {
          group_id: string
          joined_at: string
          role: Database["public"]["Enums"]["user_role_in_group"]
          user_id: string
        }
        Insert: {
          group_id: string
          joined_at?: string
          role?: Database["public"]["Enums"]["user_role_in_group"]
          user_id: string
        }
        Update: {
          group_id?: string
          joined_at?: string
          role?: Database["public"]["Enums"]["user_role_in_group"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          author_id: string
          body: string | null
          comment_count: number
          created_at: string
          edited_at: string | null
          embedding: string | null
          group_id: string | null
          id: string
          like_count: number
          media: Json | null
          pinned: boolean
          category: string | null
          category_confidence: number | null
          category_logic_version: string | null
          category_source: string | null
          category_tagged_at: string | null
          required_entitlement_key: string | null
          status: Database["public"]["Enums"]["post_status"]
        }
        Insert: {
          author_id: string
          body?: string | null
          comment_count?: number
          created_at?: string
          edited_at?: string | null
          embedding?: string | null
          group_id?: string | null
          id?: string
          like_count?: number
          media?: Json | null
          pinned?: boolean
          category?: string | null
          category_confidence?: number | null
          category_logic_version?: string | null
          category_source?: string | null
          category_tagged_at?: string | null
          required_entitlement_key?: string | null
          status?: Database["public"]["Enums"]["post_status"]
        }
        Update: {
          author_id?: string
          body?: string | null
          comment_count?: number
          created_at?: string
          edited_at?: string | null
          embedding?: string | null
          group_id?: string | null
          id?: string
          like_count?: number
          media?: Json | null
          pinned?: boolean
          category?: string | null
          category_confidence?: number | null
          category_logic_version?: string | null
          category_source?: string | null
          category_tagged_at?: string | null
          required_entitlement_key?: string | null
          status?: Database["public"]["Enums"]["post_status"]
        }
        Relationships: [
          {
            foreignKeyName: "posts_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      follows: {
        Row: {
          created_at: string
          followee_id: string
          follower_id: string
        }
        Insert: {
          created_at?: string
          followee_id: string
          follower_id: string
        }
        Update: {
          created_at?: string
          followee_id?: string
          follower_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "follows_followee_id_fkey"
            columns: ["followee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follows_follower_id_fkey"
            columns: ["follower_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      social_mux_bindings: {
        Row: {
          id: string
          author_id: string
          upload_id: string
          asset_id: string
          playback_id: string
          created_at: string
        }
        Insert: {
          id?: string
          author_id: string
          upload_id: string
          asset_id: string
          playback_id: string
          created_at?: string
        }
        Update: {
          id?: string
          author_id?: string
          upload_id?: string
          asset_id?: string
          playback_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_mux_bindings_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      social_music_scans: {
        Row: {
          id: string
          surface: Database["public"]["Enums"]["social_music_scan_surface"]
          post_id: string | null
          story_id: string | null
          profile_id: string | null
          author_id: string
          asset_id: string
          playback_id: string
          upload_id: string | null
          status: Database["public"]["Enums"]["social_music_scan_status"]
          attempt_count: number
          next_attempt_at: string | null
          last_error: string | null
          vendor: string | null
          vendor_status_code: number | null
          vendor_score: number | null
          vendor_title: string | null
          vendor_artist: string | null
          vendor_album: string | null
          vendor_acrid: string | null
          vendor_isrc: string | null
          vendor_label: string | null
          mux_ready_at: string | null
          scan_started_at: string | null
          decided_at: string | null
          duration_seconds: number | null
          window_results: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          surface: Database["public"]["Enums"]["social_music_scan_surface"]
          post_id?: string | null
          story_id?: string | null
          profile_id?: string | null
          author_id: string
          asset_id: string
          playback_id: string
          upload_id?: string | null
          status?: Database["public"]["Enums"]["social_music_scan_status"]
          attempt_count?: number
          next_attempt_at?: string | null
          last_error?: string | null
          vendor?: string | null
          vendor_status_code?: number | null
          vendor_score?: number | null
          vendor_title?: string | null
          vendor_artist?: string | null
          vendor_album?: string | null
          vendor_acrid?: string | null
          vendor_isrc?: string | null
          vendor_label?: string | null
          mux_ready_at?: string | null
          scan_started_at?: string | null
          decided_at?: string | null
          duration_seconds?: number | null
          window_results?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          surface?: Database["public"]["Enums"]["social_music_scan_surface"]
          post_id?: string | null
          story_id?: string | null
          profile_id?: string | null
          author_id?: string
          asset_id?: string
          playback_id?: string
          upload_id?: string | null
          status?: Database["public"]["Enums"]["social_music_scan_status"]
          attempt_count?: number
          next_attempt_at?: string | null
          last_error?: string | null
          vendor?: string | null
          vendor_status_code?: number | null
          vendor_score?: number | null
          vendor_title?: string | null
          vendor_artist?: string | null
          vendor_album?: string | null
          vendor_acrid?: string | null
          vendor_isrc?: string | null
          vendor_label?: string | null
          mux_ready_at?: string | null
          scan_started_at?: string | null
          decided_at?: string | null
          duration_seconds?: number | null
          window_results?: Json
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_music_scans_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_music_scans_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_music_scans_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_music_scans_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "stories"
            referencedColumns: ["id"]
          },
        ]
      }
      stories: {
        Row: {
          author_id: string
          body: string | null
          created_at: string
          expires_at: string
          id: string
          like_count: number
          media: Json
          status: Database["public"]["Enums"]["post_status"]
        }
        Insert: {
          author_id: string
          body?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          like_count?: number
          media?: Json
          status?: Database["public"]["Enums"]["post_status"]
        }
        Update: {
          author_id?: string
          body?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          like_count?: number
          media?: Json
          status?: Database["public"]["Enums"]["post_status"]
        }
        Relationships: [
          {
            foreignKeyName: "stories_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      story_views: {
        Row: {
          story_id: string
          viewed_at: string
          viewer_id: string
        }
        Insert: {
          story_id: string
          viewed_at?: string
          viewer_id: string
        }
        Update: {
          story_id?: string
          viewed_at?: string
          viewer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "story_views_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "stories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "story_views_viewer_id_fkey"
            columns: ["viewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      comments: {
        Row: {
          author_id: string
          body: string
          created_at: string
          deleted_at: string | null
          id: string
          post_id: string
        }
        Insert: {
          author_id: string
          body: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          post_id: string
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          post_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      likes: {
        Row: {
          created_at: string
          target_id: string
          target_type: Database["public"]["Enums"]["like_target"]
          user_id: string
        }
        Insert: {
          created_at?: string
          target_id: string
          target_type: Database["public"]["Enums"]["like_target"]
          user_id: string
        }
        Update: {
          created_at?: string
          target_id?: string
          target_type?: Database["public"]["Enums"]["like_target"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      leaderboard_entries: {
        Row: {
          computed_at: string
          points: number
          rank: number
          user_id: string
          window: string
        }
        Insert: {
          computed_at: string
          points: number
          rank: number
          user_id: string
          window: string
        }
        Update: {
          computed_at?: string
          points?: number
          rank?: number
          user_id?: string
          window?: string
        }
        Relationships: [
          {
            foreignKeyName: "leaderboard_entries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      level_distribution: {
        Row: {
          computed_at: string
          level: number
          member_count: number
          pct: number
        }
        Insert: {
          computed_at: string
          level: number
          member_count: number
          pct: number
        }
        Update: {
          computed_at?: string
          level?: number
          member_count?: number
          pct?: number
        }
        Relationships: [
          {
            foreignKeyName: "level_distribution_level_fkey"
            columns: ["level"]
            isOneToOne: true
            referencedRelation: "levels"
            referencedColumns: ["level"]
          },
        ]
      }
      blocks: {
        Row: {
          blocked_id: string
          blocker_id: string
          created_at: string
        }
        Insert: {
          blocked_id: string
          blocker_id: string
          created_at?: string
        }
        Update: {
          blocked_id?: string
          blocker_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "blocks_blocked_id_fkey"
            columns: ["blocked_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blocks_blocker_id_fkey"
            columns: ["blocker_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string
          created_by: string | null
          dm_key: string | null
          id: string
          kind: Database["public"]["Enums"]["conversation_kind"]
          last_message_at: string | null
          title: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          dm_key?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["conversation_kind"]
          last_message_at?: string | null
          title?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          dm_key?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["conversation_kind"]
          last_message_at?: string | null
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_participants: {
        Row: {
          conversation_id: string
          joined_at: string
          last_read_at: string | null
          left_at: string | null
          muted: boolean
          unread_count: number
          user_id: string
        }
        Insert: {
          conversation_id: string
          joined_at?: string
          last_read_at?: string | null
          left_at?: string | null
          muted?: boolean
          unread_count?: number
          user_id: string
        }
        Update: {
          conversation_id?: string
          joined_at?: string
          last_read_at?: string | null
          left_at?: string | null
          muted?: boolean
          unread_count?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_participants_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          body: string | null
          conversation_id: string
          created_at: string
          id: string
          media: Json | null
          sender_id: string | null
          status: Database["public"]["Enums"]["post_status"]
        }
        Insert: {
          body?: string | null
          conversation_id: string
          created_at?: string
          id?: string
          media?: Json | null
          sender_id?: string | null
          status?: Database["public"]["Enums"]["post_status"]
        }
        Update: {
          body?: string | null
          conversation_id?: string
          created_at?: string
          id?: string
          media?: Json | null
          sender_id?: string | null
          status?: Database["public"]["Enums"]["post_status"]
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          catalog_code: string
          cover_key: string | null
          created_at: string
          description: string | null
          id: string
          instructor_id: string | null
          is_flagship_free: boolean
          position: number
          price_cents: number | null
          slug: string
          status: Database["public"]["Enums"]["course_status"]
          title: string
        }
        Insert: {
          catalog_code?: string
          cover_key?: string | null
          created_at?: string
          description?: string | null
          id?: string
          instructor_id?: string | null
          is_flagship_free?: boolean
          position?: number
          price_cents?: number | null
          slug: string
          status?: Database["public"]["Enums"]["course_status"]
          title: string
        }
        Update: {
          catalog_code?: string
          cover_key?: string | null
          created_at?: string
          description?: string | null
          id?: string
          instructor_id?: string | null
          is_flagship_free?: boolean
          position?: number
          price_cents?: number | null
          slug?: string
          status?: Database["public"]["Enums"]["course_status"]
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "courses_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "instructors"
            referencedColumns: ["id"]
          },
        ]
      }
      modules: {
        Row: {
          course_id: string
          id: string
          position: number
          title: string
        }
        Insert: {
          course_id: string
          id?: string
          position: number
          title: string
        }
        Update: {
          course_id?: string
          id?: string
          position?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "modules_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      lessons: {
        Row: {
          cover_key: string | null
          duration_seconds: number | null
          education_video_id: string | null
          encode_error: string | null
          encode_job_id: string | null
          encode_status: Database["public"]["Enums"]["course_encode_status"] | null
          encode_updated_at: string | null
          free_preview: boolean
          hls_key: string | null
          id: string
          lesson_type: string
          module_id: string
          position: number
          source_key: string | null
          summary: string | null
          title: string
        }
        Insert: {
          cover_key?: string | null
          duration_seconds?: number | null
          education_video_id?: string | null
          encode_error?: string | null
          encode_job_id?: string | null
          encode_status?: Database["public"]["Enums"]["course_encode_status"] | null
          encode_updated_at?: string | null
          free_preview?: boolean
          hls_key?: string | null
          id?: string
          lesson_type?: string
          module_id: string
          position: number
          source_key?: string | null
          summary?: string | null
          title: string
        }
        Update: {
          cover_key?: string | null
          duration_seconds?: number | null
          education_video_id?: string | null
          encode_error?: string | null
          encode_job_id?: string | null
          encode_status?: Database["public"]["Enums"]["course_encode_status"] | null
          encode_updated_at?: string | null
          free_preview?: boolean
          hls_key?: string | null
          id?: string
          lesson_type?: string
          module_id?: string
          position?: number
          source_key?: string | null
          summary?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "lessons_education_video_id_fkey"
            columns: ["education_video_id"]
            isOneToOne: false
            referencedRelation: "education_videos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lessons_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
        ]
      }
      instructors: {
        Row: {
          bio: string | null
          created_at: string
          id: string
          name: string
        }
        Insert: {
          bio?: string | null
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          bio?: string | null
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      education_videos: {
        Row: {
          course_id: string
          created_at: string
          encode_error: string | null
          encode_job_id: string | null
          encode_status: Database["public"]["Enums"]["course_encode_status"] | null
          encode_updated_at: string | null
          hls_key: string | null
          id: string
          lesson_id: string | null
          source_key: string | null
        }
        Insert: {
          course_id: string
          created_at?: string
          encode_error?: string | null
          encode_job_id?: string | null
          encode_status?: Database["public"]["Enums"]["course_encode_status"] | null
          encode_updated_at?: string | null
          hls_key?: string | null
          id?: string
          lesson_id?: string | null
          source_key?: string | null
        }
        Update: {
          course_id?: string
          created_at?: string
          encode_error?: string | null
          encode_job_id?: string | null
          encode_status?: Database["public"]["Enums"]["course_encode_status"] | null
          encode_updated_at?: string | null
          hls_key?: string | null
          id?: string
          lesson_id?: string | null
          source_key?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "education_videos_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "education_videos_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: true
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      dashboard_sign_in_requests: {
        Row: {
          created_at: string
          email_normalized: string
          id: string
          ip: unknown
        }
        Insert: {
          created_at?: string
          email_normalized: string
          id?: string
          ip?: unknown
        }
        Update: {
          created_at?: string
          email_normalized?: string
          id?: string
          ip?: unknown
        }
        Relationships: []
      }
      deliveries: {
        Row: {
          created_at: string
          created_by: string | null
          grant_id: string
          id: string
          org_id: string
          status: Database["public"]["Enums"]["delivery_status"]
          status_note: string | null
          territory: string
          title_id: string
          updated_at: string
          vendor_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          grant_id: string
          id?: string
          org_id: string
          status?: Database["public"]["Enums"]["delivery_status"]
          status_note?: string | null
          territory: string
          title_id: string
          updated_at?: string
          vendor_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          grant_id?: string
          id?: string
          org_id?: string
          status?: Database["public"]["Enums"]["delivery_status"]
          status_note?: string | null
          territory?: string
          title_id?: string
          updated_at?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "deliveries_grant_id_fkey"
            columns: ["grant_id"]
            isOneToOne: false
            referencedRelation: "rights_grants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deliveries_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deliveries_title_id_fkey"
            columns: ["title_id"]
            isOneToOne: false
            referencedRelation: "titles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deliveries_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      export_records: {
        Row: {
          exported_at: string
          exported_by: string | null
          id: string
          payload: Json
          title_ids: string[]
          vendor_id: string
        }
        Insert: {
          exported_at?: string
          exported_by?: string | null
          id?: string
          payload: Json
          title_ids: string[]
          vendor_id: string
        }
        Update: {
          exported_at?: string
          exported_by?: string | null
          id?: string
          payload?: Json
          title_ids?: string[]
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "export_records_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      findings: {
        Row: {
          code: string
          created_at: string
          derived_at: string
          entity_id: string
          entity_type: string
          id: string
          logic_version: string
          message: string
          org_id: string
          resolved_at: string | null
          sender: Database["public"]["Enums"]["finding_sender"]
          severity: Database["public"]["Enums"]["finding_severity"]
          source: Database["public"]["Enums"]["finding_source"]
          source_refs: Json
          status: Database["public"]["Enums"]["finding_status"]
        }
        Insert: {
          code: string
          created_at?: string
          derived_at?: string
          entity_id: string
          entity_type: string
          id?: string
          logic_version: string
          message: string
          org_id: string
          resolved_at?: string | null
          sender?: Database["public"]["Enums"]["finding_sender"]
          severity: Database["public"]["Enums"]["finding_severity"]
          source: Database["public"]["Enums"]["finding_source"]
          source_refs: Json
          status?: Database["public"]["Enums"]["finding_status"]
        }
        Update: {
          code?: string
          created_at?: string
          derived_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          logic_version?: string
          message?: string
          org_id?: string
          resolved_at?: string | null
          sender?: Database["public"]["Enums"]["finding_sender"]
          severity?: Database["public"]["Enums"]["finding_severity"]
          source?: Database["public"]["Enums"]["finding_source"]
          source_refs?: Json
          status?: Database["public"]["Enums"]["finding_status"]
        }
        Relationships: [
          {
            foreignKeyName: "findings_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_periods: {
        Row: {
          closed_at: string | null
          closed_by: string | null
          closing_balance_cents: number | null
          created_at: string
          created_by: string | null
          currency: string
          id: string
          opening_balance_cents: number
          org_id: string
          period_month: number
          period_year: number
          status: Database["public"]["Enums"]["finance_period_status"]
          threshold_cents: number | null
          updated_at: string
        }
        Insert: {
          closed_at?: string | null
          closed_by?: string | null
          closing_balance_cents?: number | null
          created_at?: string
          created_by?: string | null
          currency?: string
          id?: string
          opening_balance_cents?: number
          org_id: string
          period_month: number
          period_year: number
          status?: Database["public"]["Enums"]["finance_period_status"]
          threshold_cents?: number | null
          updated_at?: string
        }
        Update: {
          closed_at?: string | null
          closed_by?: string | null
          closing_balance_cents?: number | null
          created_at?: string
          created_by?: string | null
          currency?: string
          id?: string
          opening_balance_cents?: number
          org_id?: string
          period_month?: number
          period_year?: number
          status?: Database["public"]["Enums"]["finance_period_status"]
          threshold_cents?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "finance_periods_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_jobs: {
        Row: {
          created_at: string
          error: string | null
          finished_at: string | null
          id: string
          import_id: string | null
          kind: Database["public"]["Enums"]["finance_job_kind"]
          org_id: string
          payload: Json
          period_id: string | null
          requested_by: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["finance_job_status"]
        }
        Insert: {
          created_at?: string
          error?: string | null
          finished_at?: string | null
          id?: string
          import_id?: string | null
          kind: Database["public"]["Enums"]["finance_job_kind"]
          org_id: string
          payload?: Json
          period_id?: string | null
          requested_by?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["finance_job_status"]
        }
        Update: {
          created_at?: string
          error?: string | null
          finished_at?: string | null
          id?: string
          import_id?: string | null
          kind?: Database["public"]["Enums"]["finance_job_kind"]
          org_id?: string
          payload?: Json
          period_id?: string | null
          requested_by?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["finance_job_status"]
        }
        Relationships: [
          {
            foreignKeyName: "finance_jobs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_statement_exports: {
        Row: {
          content_hash: string
          format: string
          generated_at: string
          id: string
          org_id: string
          period_id: string
          s3_key: string
        }
        Insert: {
          content_hash: string
          format: string
          generated_at?: string
          id?: string
          org_id: string
          period_id: string
          s3_key: string
        }
        Update: {
          content_hash?: string
          format?: string
          generated_at?: string
          id?: string
          org_id?: string
          period_id?: string
          s3_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "finance_statement_exports_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      ledger_entries: {
        Row: {
          amount_cents: number
          currency: string
          derived_at: string
          id: string
          kind: Database["public"]["Enums"]["ledger_entry_kind"]
          logic_version: string
          note: string | null
          org_id: string
          period_id: string
          posted_at: string
          posted_by: string | null
          sales_line_id: string | null
          source_refs: Json
          title_id: string | null
        }
        Insert: {
          amount_cents: number
          currency?: string
          derived_at?: string
          id?: string
          kind: Database["public"]["Enums"]["ledger_entry_kind"]
          logic_version?: string
          note?: string | null
          org_id: string
          period_id: string
          posted_at?: string
          posted_by?: string | null
          sales_line_id?: string | null
          source_refs?: Json
          title_id?: string | null
        }
        Update: {
          amount_cents?: number
          currency?: string
          derived_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["ledger_entry_kind"]
          logic_version?: string
          note?: string | null
          org_id?: string
          period_id?: string
          posted_at?: string
          posted_by?: string | null
          sales_line_id?: string | null
          source_refs?: Json
          title_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ledger_entries_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ledger_entries_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "finance_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ledger_entries_title_id_fkey"
            columns: ["title_id"]
            isOneToOne: false
            referencedRelation: "titles"
            referencedColumns: ["id"]
          },
        ]
      }
      legal_entities: {
        Row: {
          created_at: string
          entity_type: Database["public"]["Enums"]["entity_type"]
          id: string
          is_default: boolean
          jurisdiction: string | null
          name: string
          org_id: string
          status: Database["public"]["Enums"]["entity_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          entity_type?: Database["public"]["Enums"]["entity_type"]
          id?: string
          is_default?: boolean
          jurisdiction?: string | null
          name: string
          org_id: string
          status?: Database["public"]["Enums"]["entity_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          entity_type?: Database["public"]["Enums"]["entity_type"]
          id?: string
          is_default?: boolean
          jurisdiction?: string | null
          name?: string
          org_id?: string
          status?: Database["public"]["Enums"]["entity_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "legal_entities_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      membership_entity_grants: {
        Row: {
          created_at: string
          id: string
          legal_entity_id: string
          membership_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          legal_entity_id: string
          membership_id: string
        }
        Update: {
          created_at?: string
          id?: string
          legal_entity_id?: string
          membership_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "membership_entity_grants_membership_id_fkey"
            columns: ["membership_id"]
            isOneToOne: false
            referencedRelation: "memberships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "membership_entity_grants_legal_entity_id_fkey"
            columns: ["legal_entity_id"]
            isOneToOne: false
            referencedRelation: "legal_entities"
            referencedColumns: ["id"]
          },
        ]
      }
      invite_entity_grants: {
        Row: {
          created_at: string
          id: string
          invite_id: string
          legal_entity_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          invite_id: string
          legal_entity_id: string
        }
        Update: {
          created_at?: string
          id?: string
          invite_id?: string
          legal_entity_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invite_entity_grants_invite_id_fkey"
            columns: ["invite_id"]
            isOneToOne: false
            referencedRelation: "account_invites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invite_entity_grants_legal_entity_id_fkey"
            columns: ["legal_entity_id"]
            isOneToOne: false
            referencedRelation: "legal_entities"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_imports: {
        Row: {
          content_hash: string
          filename: string
          id: string
          imported_at: string
          imported_by: string | null
          org_id: string
          period_id: string
          s3_key: string | null
          status: Database["public"]["Enums"]["sales_import_status"]
        }
        Insert: {
          content_hash: string
          filename: string
          id?: string
          imported_at?: string
          imported_by?: string | null
          org_id: string
          period_id: string
          s3_key?: string | null
          status?: Database["public"]["Enums"]["sales_import_status"]
        }
        Update: {
          content_hash?: string
          filename?: string
          id?: string
          imported_at?: string
          imported_by?: string | null
          org_id?: string
          period_id?: string
          s3_key?: string | null
          status?: Database["public"]["Enums"]["sales_import_status"]
        }
        Relationships: [
          {
            foreignKeyName: "sales_imports_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_imports_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "finance_periods"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_lines: {
        Row: {
          created_at: string
          currency: string
          endpoint: string
          external_id: string
          bank_receipt_cents: number
          reported_cents: number | null
          id: string
          import_id: string
          line_no: number
          mapped_at: string | null
          org_id: string
          origin_period_id: string | null
          period_id: string | null
          raw: Json
          title_id: string | null
          transaction_date: string | null
        }
        Insert: {
          created_at?: string
          currency?: string
          endpoint: string
          external_id: string
          bank_receipt_cents: number
          reported_cents?: number | null
          id?: string
          import_id: string
          line_no: number
          mapped_at?: string | null
          org_id: string
          origin_period_id?: string | null
          period_id?: string | null
          raw?: Json
          title_id?: string | null
          transaction_date?: string | null
        }
        Update: {
          created_at?: string
          currency?: string
          endpoint?: string
          external_id?: string
          bank_receipt_cents?: number
          reported_cents?: number | null
          id?: string
          import_id?: string
          line_no?: number
          mapped_at?: string | null
          org_id?: string
          origin_period_id?: string | null
          period_id?: string | null
          raw?: Json
          title_id?: string | null
          transaction_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_lines_import_id_fkey"
            columns: ["import_id"]
            isOneToOne: false
            referencedRelation: "sales_imports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_lines_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_lines_origin_period_id_fkey"
            columns: ["origin_period_id"]
            isOneToOne: false
            referencedRelation: "finance_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_lines_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "finance_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_lines_title_id_fkey"
            columns: ["title_id"]
            isOneToOne: false
            referencedRelation: "titles"
            referencedColumns: ["id"]
          },
        ]
      }
      title_external_ids: {
        Row: {
          created_at: string
          created_by: string | null
          endpoint: string
          external_id: string
          id: string
          org_id: string
          title_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          endpoint: string
          external_id: string
          id?: string
          org_id: string
          title_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          endpoint?: string
          external_id?: string
          id?: string
          org_id?: string
          title_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "title_external_ids_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "title_external_ids_title_id_fkey"
            columns: ["title_id"]
            isOneToOne: false
            referencedRelation: "titles"
            referencedColumns: ["id"]
          },
        ]
      }
      gc_staff: {
        Row: {
          created_at: string
          role: Database["public"]["Enums"]["gc_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          role: Database["public"]["Enums"]["gc_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          role?: Database["public"]["Enums"]["gc_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      memberships: {
        Row: {
          created_at: string
          custom_role_id: string | null
          entity_scope: Database["public"]["Enums"]["entity_scope"]
          id: string
          org_id: string
          role: Database["public"]["Enums"]["org_role"]
          status: Database["public"]["Enums"]["membership_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          custom_role_id?: string | null
          entity_scope?: Database["public"]["Enums"]["entity_scope"]
          id?: string
          org_id: string
          role: Database["public"]["Enums"]["org_role"]
          status?: Database["public"]["Enums"]["membership_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          custom_role_id?: string | null
          entity_scope?: Database["public"]["Enums"]["entity_scope"]
          id?: string
          org_id?: string
          role?: Database["public"]["Enums"]["org_role"]
          status?: Database["public"]["Enums"]["membership_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "memberships_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_reads: {
        Row: {
          notification_id: string
          read_at: string
          user_id: string
        }
        Insert: {
          notification_id: string
          read_at?: string
          user_id: string
        }
        Update: {
          notification_id?: string
          read_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_reads_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "notifications"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string
          created_at: string
          created_by: string | null
          id: string
          kind: Database["public"]["Enums"]["notification_kind"]
          org_id: string | null
          recipient_user_id: string | null
          sender: Database["public"]["Enums"]["notification_sender"]
          source_refs: Json
          title: string
        }
        Insert: {
          body: string
          created_at?: string
          created_by?: string | null
          id?: string
          kind: Database["public"]["Enums"]["notification_kind"]
          org_id?: string | null
          recipient_user_id?: string | null
          sender?: Database["public"]["Enums"]["notification_sender"]
          source_refs: Json
          title: string
        }
        Update: {
          body?: string
          created_at?: string
          created_by?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["notification_kind"]
          org_id?: string | null
          recipient_user_id?: string | null
          sender?: Database["public"]["Enums"]["notification_sender"]
          source_refs?: Json
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_payout_details: {
        Row: {
          created_at: string
          org_id: string
          payout_display: string | null
          payout_status: string | null
          tax_form_status: string | null
          trolley_recipient_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          org_id: string
          payout_display?: string | null
          payout_status?: string | null
          tax_form_status?: string | null
          trolley_recipient_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          org_id?: string
          payout_display?: string | null
          payout_status?: string | null
          tax_form_status?: string | null
          trolley_recipient_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_payout_details_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      org_custom_role_capabilities: {
        Row: {
          capability: string
          role_id: string
        }
        Insert: {
          capability: string
          role_id: string
        }
        Update: {
          capability?: string
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_custom_role_capabilities_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "org_custom_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      org_custom_roles: {
        Row: {
          created_at: string
          created_by: string
          description: string
          id: string
          name: string
          org_id: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string
          id?: string
          name: string
          org_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string
          id?: string
          name?: string
          org_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_custom_roles_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_custom_roles_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          dunning_hold: boolean
          id: string
          name: string
          status: Database["public"]["Enums"]["org_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          dunning_hold?: boolean
          id?: string
          name: string
          status?: Database["public"]["Enums"]["org_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          dunning_hold?: boolean
          id?: string
          name?: string
          status?: Database["public"]["Enums"]["org_status"]
          updated_at?: string
        }
        Relationships: []
      }
      portal_access_events: {
        Row: {
          company: string | null
          email: string | null
          event_type: Database["public"]["Enums"]["portal_event"]
          id: string
          ip: unknown
          link_id: string
          name: string | null
          occurred_at: string
          session_id: string | null
          user_agent: string | null
        }
        Insert: {
          company?: string | null
          email?: string | null
          event_type: Database["public"]["Enums"]["portal_event"]
          id?: string
          ip?: unknown
          link_id: string
          name?: string | null
          occurred_at?: string
          session_id?: string | null
          user_agent?: string | null
        }
        Update: {
          company?: string | null
          email?: string | null
          event_type?: Database["public"]["Enums"]["portal_event"]
          id?: string
          ip?: unknown
          link_id?: string
          name?: string | null
          occurred_at?: string
          session_id?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "portal_access_events_link_id_fkey"
            columns: ["link_id"]
            isOneToOne: false
            referencedRelation: "portal_links"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_access_events_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "portal_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      portal_links: {
        Row: {
          asset_id: string | null
          created_at: string
          created_by: string | null
          delivery_id: string | null
          expires_at: string
          id: string
          purpose: Database["public"]["Enums"]["portal_link_purpose"]
          recipient_name: string | null
          revoked_at: string | null
          share_token: string | null
          title_id: string | null
          token_hash: string
          vendor_id: string | null
        }
        Insert: {
          asset_id?: string | null
          created_at?: string
          created_by?: string | null
          delivery_id?: string | null
          expires_at: string
          id?: string
          purpose?: Database["public"]["Enums"]["portal_link_purpose"]
          recipient_name?: string | null
          revoked_at?: string | null
          share_token?: string | null
          title_id?: string | null
          token_hash: string
          vendor_id?: string | null
        }
        Update: {
          asset_id?: string | null
          created_at?: string
          created_by?: string | null
          delivery_id?: string | null
          expires_at?: string
          id?: string
          purpose?: Database["public"]["Enums"]["portal_link_purpose"]
          recipient_name?: string | null
          revoked_at?: string | null
          share_token?: string | null
          title_id?: string | null
          token_hash?: string
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "portal_links_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_links_delivery_id_fkey"
            columns: ["delivery_id"]
            isOneToOne: false
            referencedRelation: "deliveries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_links_title_id_fkey"
            columns: ["title_id"]
            isOneToOne: false
            referencedRelation: "titles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_links_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      portal_otps: {
        Row: {
          attempts: number
          code_hash: string
          consumed_at: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          link_id: string
        }
        Insert: {
          attempts?: number
          code_hash: string
          consumed_at?: string | null
          created_at?: string
          email: string
          expires_at: string
          id?: string
          link_id: string
        }
        Update: {
          attempts?: number
          code_hash?: string
          consumed_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          link_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "portal_otps_link_id_fkey"
            columns: ["link_id"]
            isOneToOne: false
            referencedRelation: "portal_links"
            referencedColumns: ["id"]
          },
        ]
      }
      portal_sessions: {
        Row: {
          company: string
          created_at: string
          email: string
          expires_at: string
          id: string
          link_id: string
          name: string
          revoked_at: string | null
          token_hash: string
        }
        Insert: {
          company: string
          created_at?: string
          email: string
          expires_at: string
          id?: string
          link_id: string
          name: string
          revoked_at?: string | null
          token_hash: string
        }
        Update: {
          company?: string
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          link_id?: string
          name?: string
          revoked_at?: string | null
          token_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "portal_sessions_link_id_fkey"
            columns: ["link_id"]
            isOneToOne: false
            referencedRelation: "portal_links"
            referencedColumns: ["id"]
          },
        ]
      }
      rights_grants: {
        Row: {
          created_at: string
          created_by: string | null
          effective_from: string
          effective_to: string | null
          exclusive: boolean
          id: string
          org_id: string
          rights_type: Database["public"]["Enums"]["rights_type"]
          territories: string[]
          territory_mode: Database["public"]["Enums"]["territory_mode"]
          title_id: string
          updated_at: string
          window_end: string | null
          window_start: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          effective_from: string
          effective_to?: string | null
          exclusive?: boolean
          id?: string
          org_id: string
          rights_type: Database["public"]["Enums"]["rights_type"]
          territories?: string[]
          territory_mode: Database["public"]["Enums"]["territory_mode"]
          title_id: string
          updated_at?: string
          window_end?: string | null
          window_start?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          effective_from?: string
          effective_to?: string | null
          exclusive?: boolean
          id?: string
          org_id?: string
          rights_type?: Database["public"]["Enums"]["rights_type"]
          territories?: string[]
          territory_mode?: Database["public"]["Enums"]["territory_mode"]
          title_id?: string
          updated_at?: string
          window_end?: string | null
          window_start?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rights_grants_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rights_grants_title_id_fkey"
            columns: ["title_id"]
            isOneToOne: false
            referencedRelation: "titles"
            referencedColumns: ["id"]
          },
        ]
      }
      screener_view_events: {
        Row: {
          event_type: Database["public"]["Enums"]["screener_event"]
          id: string
          link_id: string
          occurred_at: string
          position_seconds: number
          runtime_seconds: number | null
          session_id: string
        }
        Insert: {
          event_type: Database["public"]["Enums"]["screener_event"]
          id?: string
          link_id: string
          occurred_at?: string
          position_seconds?: number
          runtime_seconds?: number | null
          session_id: string
        }
        Update: {
          event_type?: Database["public"]["Enums"]["screener_event"]
          id?: string
          link_id?: string
          occurred_at?: string
          position_seconds?: number
          runtime_seconds?: number | null
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "screener_view_events_link_id_fkey"
            columns: ["link_id"]
            isOneToOne: false
            referencedRelation: "portal_links"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "screener_view_events_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "portal_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      security_events: {
        Row: {
          id: string
          org_id: string | null
          actor_user_id: string | null
          event_kind: Database["public"]["Enums"]["security_event_kind"]
          occurred_at: string
          ip: string | null
          user_agent: string | null
          source_label: string | null
          country: string | null
          metadata: Json | null
        }
        Insert: {
          id?: string
          org_id?: string | null
          actor_user_id?: string | null
          event_kind: Database["public"]["Enums"]["security_event_kind"]
          occurred_at?: string
          ip?: string | null
          user_agent?: string | null
          source_label?: string | null
          country?: string | null
          metadata?: Json | null
        }
        Update: {
          id?: string
          org_id?: string | null
          actor_user_id?: string | null
          event_kind?: Database["public"]["Enums"]["security_event_kind"]
          occurred_at?: string
          ip?: string | null
          user_agent?: string | null
          source_label?: string | null
          country?: string | null
          metadata?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "security_events_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      source_documents: {
        Row: {
          content_hash: string
          created_at: string
          id: string
          kind: string
          org_id: string
          provided_by: string | null
          raw: Json | null
          received_at: string
          storage_key: string | null
        }
        Insert: {
          content_hash: string
          created_at?: string
          id?: string
          kind: string
          org_id: string
          provided_by?: string | null
          raw?: Json | null
          received_at?: string
          storage_key?: string | null
        }
        Update: {
          content_hash?: string
          created_at?: string
          id?: string
          kind?: string
          org_id?: string
          provided_by?: string | null
          raw?: Json | null
          received_at?: string
          storage_key?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "source_documents_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      source_records: {
        Row: {
          created_at: string
          document_id: string
          id: string
          line_no: number | null
          org_id: string
          parsed: Json
        }
        Insert: {
          created_at?: string
          document_id: string
          id?: string
          line_no?: number | null
          org_id: string
          parsed: Json
        }
        Update: {
          created_at?: string
          document_id?: string
          id?: string
          line_no?: number | null
          org_id?: string
          parsed?: Json
        }
        Relationships: [
          {
            foreignKeyName: "source_records_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "source_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "source_records_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          annual_price_cents: number
          created_at: string
          current_period_end: string | null
          id: string
          org_id: string
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          tier: Database["public"]["Enums"]["tier_enum"]
          updated_at: string
        }
        Insert: {
          annual_price_cents: number
          created_at?: string
          current_period_end?: string | null
          id?: string
          org_id: string
          status: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          tier: Database["public"]["Enums"]["tier_enum"]
          updated_at?: string
        }
        Update: {
          annual_price_cents?: number
          created_at?: string
          current_period_end?: string | null
          id?: string
          org_id?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          tier?: Database["public"]["Enums"]["tier_enum"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      title_metadata: {
        Row: {
          created_at: string
          data: Json
          org_id: string
          title_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          data?: Json
          org_id: string
          title_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          data?: Json
          org_id?: string
          title_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "title_metadata_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "title_metadata_title_id_fkey"
            columns: ["title_id"]
            isOneToOne: true
            referencedRelation: "titles"
            referencedColumns: ["id"]
          },
        ]
      }
      title_reviews: {
        Row: {
          created_at: string
          decision: Database["public"]["Enums"]["review_decision"]
          id: string
          org_id: string
          reason: string | null
          reviewer: string | null
          title_id: string
        }
        Insert: {
          created_at?: string
          decision: Database["public"]["Enums"]["review_decision"]
          id?: string
          org_id: string
          reason?: string | null
          reviewer?: string | null
          title_id: string
        }
        Update: {
          created_at?: string
          decision?: Database["public"]["Enums"]["review_decision"]
          id?: string
          org_id?: string
          reason?: string | null
          reviewer?: string | null
          title_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "title_reviews_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "title_reviews_title_id_fkey"
            columns: ["title_id"]
            isOneToOne: false
            referencedRelation: "titles"
            referencedColumns: ["id"]
          },
        ]
      }
      title_status_overrides: {
        Row: {
          actor: string | null
          created_at: string
          from_status: Database["public"]["Enums"]["title_status"]
          id: string
          org_id: string
          reason: string
          title_id: string
          to_status: Database["public"]["Enums"]["title_status"]
        }
        Insert: {
          actor?: string | null
          created_at?: string
          from_status: Database["public"]["Enums"]["title_status"]
          id?: string
          org_id: string
          reason: string
          title_id: string
          to_status: Database["public"]["Enums"]["title_status"]
        }
        Update: {
          actor?: string | null
          created_at?: string
          from_status?: Database["public"]["Enums"]["title_status"]
          id?: string
          org_id?: string
          reason?: string
          title_id?: string
          to_status?: Database["public"]["Enums"]["title_status"]
        }
        Relationships: [
          {
            foreignKeyName: "title_status_overrides_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "title_status_overrides_title_id_fkey"
            columns: ["title_id"]
            isOneToOne: false
            referencedRelation: "titles"
            referencedColumns: ["id"]
          },
        ]
      }
      titles: {
        Row: {
          archived_from: Database["public"]["Enums"]["title_status"] | null
          catalog_id: string | null
          catalog_no: number
          created_at: string
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          id: string
          legal_entity_id: string
          org_id: string
          original_release_date: string | null
          release_date: string | null
          release_type: Database["public"]["Enums"]["release_type"]
          s3_purged_at: string | null
          screener_source: Database["public"]["Enums"]["screener_source"]
          status: Database["public"]["Enums"]["title_status"]
          title: string
          updated_at: string
          work_id: string | null
        }
        Insert: {
          archived_from?: Database["public"]["Enums"]["title_status"] | null
          catalog_id?: string | null
          catalog_no?: number
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          legal_entity_id: string
          org_id: string
          original_release_date?: string | null
          release_date?: string | null
          release_type?: Database["public"]["Enums"]["release_type"]
          s3_purged_at?: string | null
          screener_source?: Database["public"]["Enums"]["screener_source"]
          status?: Database["public"]["Enums"]["title_status"]
          title: string
          updated_at?: string
          work_id?: string | null
        }
        Update: {
          archived_from?: Database["public"]["Enums"]["title_status"] | null
          catalog_id?: string | null
          catalog_no?: number
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          legal_entity_id?: string
          org_id?: string
          original_release_date?: string | null
          release_date?: string | null
          release_type?: Database["public"]["Enums"]["release_type"]
          s3_purged_at?: string | null
          screener_source?: Database["public"]["Enums"]["screener_source"]
          status?: Database["public"]["Enums"]["title_status"]
          title?: string
          updated_at?: string
          work_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "titles_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "titles_work_id_fkey"
            columns: ["work_id"]
            isOneToOne: false
            referencedRelation: "works"
            referencedColumns: ["id"]
          },
        ]
      }
      transcode_jobs: {
        Row: {
          completed_at: string | null
          created_at: string
          expected_output_key: string
          external_job_id: string | null
          failure_reason: string | null
          id: string
          org_id: string
          output_asset_id: string | null
          source_asset_id: string
          status: Database["public"]["Enums"]["transcode_status"]
          title_id: string
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          expected_output_key: string
          external_job_id?: string | null
          failure_reason?: string | null
          id?: string
          org_id: string
          output_asset_id?: string | null
          source_asset_id: string
          status?: Database["public"]["Enums"]["transcode_status"]
          title_id: string
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          expected_output_key?: string
          external_job_id?: string | null
          failure_reason?: string | null
          id?: string
          org_id?: string
          output_asset_id?: string | null
          source_asset_id?: string
          status?: Database["public"]["Enums"]["transcode_status"]
          title_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "transcode_jobs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transcode_jobs_output_asset_id_fkey"
            columns: ["output_asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transcode_jobs_source_asset_id_fkey"
            columns: ["source_asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transcode_jobs_title_id_fkey"
            columns: ["title_id"]
            isOneToOne: false
            referencedRelation: "titles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_notification_preferences: {
        Row: {
          prefs: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          prefs?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          prefs?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      vendors: {
        Row: {
          active: boolean
          company_info: Json | null
          created_at: string
          delivery_mode: Database["public"]["Enums"]["vendor_mode"]
          email_cc: string[]
          email_template: string | null
          email_to: string[]
          export_format_spec: Json | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          company_info?: Json | null
          created_at?: string
          delivery_mode: Database["public"]["Enums"]["vendor_mode"]
          email_cc?: string[]
          email_template?: string | null
          email_to?: string[]
          export_format_spec?: Json | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          company_info?: Json | null
          created_at?: string
          delivery_mode?: Database["public"]["Enums"]["vendor_mode"]
          email_cc?: string[]
          email_template?: string | null
          email_to?: string[]
          export_format_spec?: Json | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      works: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          label: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          label?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          label?: string | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_account_invite: { Args: { p_token_hash: string }; Returns: Json }
      account_invite_normalize_email: { Args: { p_email: string }; Returns: string }
      archive_title: { Args: { p_title_id: string }; Returns: undefined }
      accept_terms: {
        Args: {
          p_content_hash: string
          p_ip?: unknown
          p_rendered_text: string
          p_terms_version: string
          p_tier: Database["public"]["Enums"]["tier_enum"]
          p_user_agent?: string
        }
        Returns: Json
      }
      add_conversation_participants: {
        Args: { p_conversation: string; p_peers: string[] }
        Returns: string
      }
      create_group_conversation: {
        Args: { p_peers: string[] }
        Returns: string
      }
      add_rights_grant: {
        Args: {
          p_effective_from?: string
          p_exclusive: boolean
          p_mode: Database["public"]["Enums"]["territory_mode"]
          p_org_id: string
          p_rights_types: Database["public"]["Enums"]["rights_type"][]
          p_territories: string[]
          p_title_id: string
          p_window_end?: string
          p_window_start?: string
        }
        Returns: string[]
      }
      attach_link_vendor: {
        // p_vendor_id has `default null` in SQL (20260807000200) — omitting it (pass
        // `undefined`) is how a caller detaches a vendor from a link. A nullable-but-required
        // arg (`string | null` with no `?`) is not a shape this generator ever produces; if you
        // see one here by hand, distrust it — it will not survive the next regeneration.
        Args: { p_force?: boolean; p_link_id: string; p_vendor_id?: string }
        Returns: undefined
      }
      caller_may_inspect: { Args: { p_user: string }; Returns: boolean }
      can_access_conversation: {
        Args: { p_conversation: string; p_user: string }
        Returns: boolean
      }
      can_access_group_content: {
        Args: { p_group: string; p_user: string }
        Returns: boolean
      }
      can_deliver: {
        Args: {
          p_at: string
          p_rights_type: Database["public"]["Enums"]["rights_type"]
          p_territory: string
          p_title_id: string
        }
        Returns: boolean
      }
      can_see_group: {
        Args: { p_group: string; p_user: string }
        Returns: boolean
      }
      can_self_join_group: {
        Args: { p_group: string; p_user: string }
        Returns: boolean
      },
      social_music_author_notices: {
        Args: { p_post_ids: string[]; p_story_ids: string[] }
        Returns: { post_id: string | null; story_id: string | null; notice: string | null }[]
      }
      retire_superseded_music_scan: {
        Args: { p_id: string }
        Returns: boolean
      }
      create_asset: {
        Args: {
          p_bytes: number
          p_content_hash: string
          p_content_type?: string
          p_kind: Database["public"]["Enums"]["asset_kind"]
          p_org_id: string
          p_original_filename?: string
          p_storage_key: string
          p_title_id: string
        }
        Returns: string
      }
      create_delivery: {
        Args: {
          p_grant_id: string
          p_territory: string
          p_title_id: string
          p_vendor_id: string
        }
        Returns: string
      }
      create_notification: {
        Args: {
          p_body: string
          p_kind: Database["public"]["Enums"]["notification_kind"]
          p_org_id: string
          p_source_refs: Json
          p_title: string
        }
        Returns: string
      }
      create_org_and_membership: { Args: { p_name: string }; Returns: string }
      create_org_custom_role: {
        Args: {
          p_capabilities: string[]
          p_description: string
          p_name: string
          p_org: string
        }
        Returns: string
      }
      create_portal_link: {
        Args: {
          p_asset_id: string
          p_delivery_id: string
          p_expires_at?: string
          p_token_hash: string
        }
        Returns: string
      }
      create_screener_link: {
        Args: {
          p_expires_at?: string
          p_recipient_name?: string
          p_share_token?: string
          p_title_id: string
          p_token_hash: string
        }
        Returns: string
      }
      create_legal_entity: {
        Args: {
          p_org_id: string
          p_name: string
          p_entity_type?: Database["public"]["Enums"]["entity_type"]
          p_jurisdiction?: string
        }
        Returns: string
      }
      update_legal_entity: {
        Args: {
          p_entity_id: string
          p_name: string
          p_entity_type?: Database["public"]["Enums"]["entity_type"]
          p_jurisdiction?: string
        }
        Returns: undefined
      }
      create_title: {
        Args: {
          p_org_id: string
          p_original_release_date?: string
          p_release_type: Database["public"]["Enums"]["release_type"]
          p_title: string
          p_legal_entity_id?: string
        }
        Returns: string
      }
      apply_finance_close: { Args: { p_period_id: string }; Returns: undefined }
      apply_finance_export: {
        Args: {
          p_content_hash: string
          p_format: string
          p_period_id: string
          p_s3_key: string
        }
        Returns: string
      }
      apply_sales_import: {
        Args: { p_import_id: string; p_lines: Json }
        Returns: number
      }
      close_finance_period: { Args: { p_period_id: string }; Returns: undefined }
      create_finance_period: {
        Args: {
          p_month: number
          p_org_id: string
          p_threshold_cents?: number | null
          p_year: number
        }
        Returns: string
      }
      enqueue_finance_job: {
        Args: {
          p_import_id?: string | null
          p_kind: Database["public"]["Enums"]["finance_job_kind"]
          p_org_id: string
          p_payload?: Json
          p_period_id?: string | null
        }
        Returns: string
      }
      finance_client_share_cents: {
        Args: { p_gross: number; p_rate_bp: number }
        Returns: number
      }
      finance_logic_version: { Args: Record<PropertyKey, never>; Returns: string }
      finance_worker_only: { Args: Record<PropertyKey, never>; Returns: undefined }
      import_sales: {
        Args: {
          p_content_hash: string
          p_filename: string
          p_lines: Json
          p_period_id: string
        }
        Returns: string
      }
      request_finance_export: { Args: { p_period_id: string }; Returns: string }
      request_sales_import: {
        Args: {
          p_content_hash: string
          p_filename: string
          p_period_id: string
          p_s3_key: string
        }
        Returns: string
      }
      map_sales_import: { Args: { p_import_id: string }; Returns: number }
      map_sales_line: {
        Args: { p_line_id: string; p_title_id: string }
        Returns: undefined
      }
      move_sales_lines_to_suspense: {
        Args: { p_line_ids: string[] }
        Returns: number
      }
      assign_suspense_lines_to_period: {
        Args: { p_line_ids: string[]; p_period_id: string }
        Returns: number
      }
      post_ledger_entry: {
        Args: {
          p_amount_cents: number
          p_kind: Database["public"]["Enums"]["ledger_entry_kind"]
          p_note?: string | null
          p_period_id: string
          p_sales_line_id?: string | null
          p_title_id?: string | null
        }
        Returns: string
      }
      set_finance_period_threshold: {
        Args: { p_period_id: string; p_threshold_cents: number | null }
        Returns: undefined
      }
      upsert_title_external_id: {
        Args: { p_endpoint: string; p_external_id: string; p_title_id: string }
        Returns: string
      }
      conversation_has_block: {
        Args: { p_conversation: string; p_user: string }
        Returns: boolean
      }
      create_transcode_job: {
        Args: {
          p_expected_output_key: string
          p_external_job_id?: string
          p_org_id: string
          p_source_asset_id: string
          p_title_id: string
        }
        Returns: string
      }
      direct_dm_key: { Args: { p_a: string; p_b: string }; Returns: string }
      fail_transcode_job: {
        Args: { p_job_id: string; p_reason?: string }
        Returns: undefined
      }
      finalize_paid_signup: {
        Args: {
          p_effective_from: string
          p_org: string
          p_price_cents: number
          p_source_document_id: string
          p_stripe_customer: string
          p_stripe_subscription: string
          p_tier: Database["public"]["Enums"]["tier_enum"]
        }
        Returns: undefined
      }
      gc_can: {
        Args: { p_capability: string; p_uid: string }
        Returns: boolean
      }
      grant_house_account: {
        Args: {
          p_email: string
          p_org_name: string
          p_tier: Database["public"]["Enums"]["tier_enum"]
          p_token_hash: string
        }
        Returns: string
      }
      gc_set_title_status: {
        Args: {
          p_reason: string
          p_status: Database["public"]["Enums"]["title_status"]
          p_title_id: string
        }
        Returns: undefined
      }
      gc_check_digit: { Args: { p_n: number }; Returns: number }
      gc_client_directory: {
        Args: { p_limit?: number }
        Returns: {
          email: string
          joined_at: string
          last_sign_in: string
          org_id: string
          org_status: Database["public"]["Enums"]["org_status"]
          organization: string
          role: Database["public"]["Enums"]["org_role"]
          subscription_status: string
          term_expires_at: string
          tier: Database["public"]["Enums"]["tier_enum"]
          user_id: string
        }[]
      }
      get_dm_inbox: {
        Args: { p_limit?: number }
        Returns: {
          conversation_id: string
          kind: Database["public"]["Enums"]["conversation_kind"]
          last_message_at: string | null
          muted: boolean
          participant_ids: string[]
          peer_id: string | null
          title: string | null
          unread_count: number
        }[]
      }
      has_capability: {
        Args: { p_cap: string; p_user: string }
        Returns: boolean
      }
      has_course_access: {
        Args: { p_course: string; p_user: string }
        Returns: boolean
      }
      next_course_catalog_code: { Args: Record<PropertyKey, never>; Returns: string }
      is_active_conversation_participant: {
        Args: { p_conversation: string; p_user: string }
        Returns: boolean
      }
      is_active_profile: { Args: { p_user: string }; Returns: boolean }
      is_blocked_either_way: {
        Args: { p_a: string; p_b: string }
        Returns: boolean
      }
      is_gc_staff: { Args: { p_uid: string }; Returns: boolean }
      invite_org_member: {
        Args: {
          p_email: string
          p_org: string
          p_role: Database["public"]["Enums"]["org_role"]
          p_token_hash: string
          p_entity_scope?: Database["public"]["Enums"]["entity_scope"]
          p_entity_ids?: string[]
        }
        Returns: string
      }
      is_group_member: {
        Args: { p_group: string; p_user: string }
        Returns: boolean
      }
      lapse_org: {
        Args: { p_first_failure: string; p_org: string }
        Returns: string
      }
      link_title_to_work_of: {
        Args: { p_target_title_id: string; p_title_id: string }
        Returns: string
      }
      mark_direct_conversation_read: {
        Args: { p_conversation: string; p_seen_at: string }
        Returns: undefined
      }
      list_org_custom_roles: {
        Args: { p_org: string }
        Returns: {
          capabilities: string[]
          created_at: string
          description: string
          id: string
          member_count: number
          name: string
          status: string
        }[]
      }
      mark_notifications_read: { Args: { p_ids: string[] }; Returns: undefined }
      member_can: {
        Args: { p_capability: string; p_org: string; p_uid: string }
        Returns: boolean
      }
      member_can_entity: {
        Args: { p_uid: string; p_org: string; p_entity: string }
        Returns: boolean
      }
      member_tier_rank: { Args: { p_user: string }; Returns: number }
      my_entity_ids: {
        Args: { p_org: string }
        Returns: { id: string }[]
      }
      meets_group_access: {
        Args: { p_group: string; p_user: string }
        Returns: boolean
      }
      my_deliveries: {
        Args: { p_limit?: number; p_title_id?: string }
        Returns: {
          delivery_id: string
          status: Database["public"]["Enums"]["delivery_status"]
          territory: string
          title: string
          title_id: string
          updated_at: string
          vendor_name: string
        }[]
      }
      my_findings: {
        Args: { p_limit?: number; p_org_id?: string }
        Returns: {
          code: string
          created_at: string
          derived_at: string
          entity_id: string
          entity_type: string
          id: string
          logic_version: string
          message: string
          org_id: string
          resolved_at: string | null
          sender: Database["public"]["Enums"]["finding_sender"]
          severity: Database["public"]["Enums"]["finding_severity"]
          source: Database["public"]["Enums"]["finding_source"]
          source_refs: Json
          status: Database["public"]["Enums"]["finding_status"]
        }[]
        SetofOptions: {
          from: "*"
          to: "findings"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      my_notifications: {
        Args: { p_limit?: number }
        Returns: {
          body: string
          created_at: string
          id: string
          kind: Database["public"]["Enums"]["notification_kind"]
          org_id: string | null
          source_refs: Json
          title: string
          unread: boolean
        }[]
      }
      my_unread_count: { Args: never; Returns: number }
      notify_new_follower: {
        Args: {
          p_body: string
          p_followee: string
          p_source_refs: Json
          p_title: string
        }
        Returns: string | null
      }
      open_or_get_direct_conversation: {
        Args: { p_peer: string }
        Returns: string
      }
      org_notification_recipients: {
        Args: { p_org_id: string }
        Returns: string[]
      }
      org_legal_entities: {
        Args: { p_org: string }
        Returns: {
          created_at: string
          entity_type: Database["public"]["Enums"]["entity_type"]
          id: string
          is_default: boolean
          jurisdiction: string | null
          name: string
          status: Database["public"]["Enums"]["entity_status"]
        }[]
      }
      org_pending_invites: {
        Args: { p_limit?: number; p_org: string }
        Returns: {
          created_at: string
          email: string
          entity_scope: Database["public"]["Enums"]["entity_scope"]
          expires_at: string
          id: string
          role: Database["public"]["Enums"]["org_role"]
        }[]
      }
      org_team: {
        Args: { p_limit?: number; p_org: string }
        Returns: {
          display_name: string | null
          email: string
          entity_scope: Database["public"]["Enums"]["entity_scope"]
          invited_at: string | null
          joined_at: string
          role: Database["public"]["Enums"]["org_role"]
          status: Database["public"]["Enums"]["membership_status"]
          user_id: string
        }[]
      }
      peek_account_invite: {
        Args: { p_token_hash: string }
        Returns: {
          email: string
          expires_at: string
          id: string
          kind: Database["public"]["Enums"]["account_invite_kind"]
          org_name: string | null
          role: Database["public"]["Enums"]["org_role"] | null
          status: Database["public"]["Enums"]["account_invite_status"]
          tier: Database["public"]["Enums"]["tier_enum"] | null
        }[]
      }
      house_grants: {
        Args: { p_limit?: number }
        Returns: {
          accepted_at: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          org_id: string | null
          org_name: string
          status: Database["public"]["Enums"]["account_invite_status"]
          tier: Database["public"]["Enums"]["tier_enum"]
        }[]
      }
      portal_claim_otp_attempt: {
        Args: { p_max_attempts: number; p_otp_id: string }
        Returns: number | null
      }
      portal_resolve_download: {
        Args: { p_session_token_hash: string }
        Returns: {
          link_id: string
          session_id: string
          storage_key: string
        }[]
      }
      portal_resolve_screener: {
        Args: { p_session_token_hash: string }
        Returns: {
          asset_kind: Database["public"]["Enums"]["asset_kind"]
          link_id: string
          session_id: string
          storage_key: string
          title_id: string
        }[]
      }
      profile_cover_crop_valid: { Args: { p_crop: Json }; Returns: boolean }
      rebuild_leaderboards: { Args: never; Returns: undefined }
      reconcile_title_findings: {
        Args: {
          p_findings: Json
          p_logic_version: string
          p_org_id: string
          p_title_id: string
        }
        Returns: undefined
      }
      record_export: {
        Args: { p_payload: Json; p_title_ids: string[]; p_vendor_id: string }
        Returns: string
      }
      record_renewal: {
        Args: { p_effective_from: string; p_org: string }
        Returns: string
      }
      register_transcode_output: {
        Args: {
          p_bytes: number
          p_content_hash: string
          p_job_id: string
          p_storage_key: string
        }
        Returns: string
      }
      review_title: {
        Args: {
          p_decision: Database["public"]["Enums"]["review_decision"]
          p_reason: string
          p_title_id: string
        }
        Returns: undefined
      }
      revoke_account_invite: { Args: { p_id: string }; Returns: undefined }
      revoke_portal_link: { Args: { p_link_id: string }; Returns: undefined }
      revoke_portal_session: {
        Args: { p_session_id: string }
        Returns: undefined
      }
      same_work_conflicts: {
        Args: { p_title_id: string }
        Returns: {
          other_org_name: string
          other_title: string
          other_title_id: string
          rights_type: Database["public"]["Enums"]["rights_type"]
        }[]
      }
      screener_engagement: {
        Args: { p_link_id: string }
        Returns: {
          company: string
          completed: boolean
          email: string
          last_viewed: string
          name: string
          replays: number
          session_id: string
          watched_pct: number
        }[]
      }
      scoped_title_ids: {
        Args: { p_uid: string; p_org: string }
        Returns: { id: string }[]
      }
      set_delivery_status: {
        Args: {
          p_delivery_id: string
          p_note?: string
          p_status: Database["public"]["Enums"]["delivery_status"]
        }
        Returns: undefined
      }
      set_release_date: {
        Args: { p_date?: string; p_title_id: string }
        Returns: undefined
      }
      set_screener_source: {
        Args: {
          p_source: Database["public"]["Enums"]["screener_source"]
          p_title_id: string
        }
        Returns: undefined
      }
      set_title_metadata: {
        Args: { p_data: Json; p_org_id: string; p_title_id: string }
        Returns: undefined
      }
      set_group_conversation_title: {
        Args: { p_conversation: string; p_title: string | null }
        Returns: undefined
      }
      set_title_release_info: {
        Args: {
          p_org_id: string
          p_original_release_date?: string
          p_release_type: Database["public"]["Enums"]["release_type"]
          p_title_id: string
        }
        Returns: undefined
      }
      shares_direct_conversation: {
        Args: { p_a: string; p_b: string }
        Returns: boolean
      }
      shares_group: { Args: { p_a: string; p_b: string }; Returns: boolean }
      social_media_keys_owned: {
        Args: { p_media: Json; p_author: string; p_lane: string }
        Returns: boolean
      }
      restore_title: { Args: { p_title_id: string }; Returns: undefined }
      submit_title: {
        Args: { p_org_id: string; p_title_id: string }
        Returns: undefined
      }
      delete_title: { Args: { p_title_id: string }; Returns: undefined }
      mark_deleted_title_prefix_purged: {
        Args: { p_title_id: string }
        Returns: undefined
      }
      title_has_delivered_endpoint: {
        Args: { p_title_id: string }
        Returns: boolean
      }
      title_has_reporting_activity: {
        Args: { p_title_id: string }
        Returns: boolean
      }
      title_status_override_locked: {
        Args: { p_title_id: string }
        Returns: boolean
      }
      suggest_same_work: {
        Args: { p_title_id: string }
        Returns: {
          org_name: string
          release_year: string
          title: string
          title_id: string
        }[]
      }
      territories_overlap: {
        Args: {
          p_mode_a: Database["public"]["Enums"]["territory_mode"]
          p_mode_b: Database["public"]["Enums"]["territory_mode"]
          p_terr_a: string[]
          p_terr_b: string[]
        }
        Returns: boolean
      }
      tier_allows: {
        Args: { p_action: string; p_org: string }
        Returns: boolean
      }
      tier_revenue_share_bp: {
        Args: { p_tier: Database["public"]["Enums"]["tier_enum"] }
        Returns: number
      }
      title_vendor_licensed: {
        Args: { p_title_id: string; p_vendor_id: string }
        Returns: boolean
      }
    }
    Enums: {
      account_invite_kind: "team" | "house_grant"
      account_invite_status: "pending" | "accepted" | "revoked" | "expired"
      entity_scope: "all" | "selected"
      entity_status: "active" | "archived"
      entity_type: "sole_prop" | "llc" | "corporation" | "partnership" | "trust" | "nonprofit" | "individual" | "other"
      account_status: "active" | "deactivated" | "pending_deletion" | "erased"
      app_role: "member" | "moderator" | "admin"
      asset_kind:
        | "master"
        | "caption"
        | "artwork"
        | "screener"
        | "poster"
        | "banner"
        | "trailer"
      conversation_kind: "direct" | "group"
      conversation_role: "user" | "globee"
      conversation_thumb: "up" | "down"
      course_encode_status:
        | "submitted"
        | "running"
        | "complete"
        | "failed"
        | "submit_failed"
      course_status: "draft" | "published" | "archived"
      delivery_status:
        | "pending"
        | "delivered"
        | "live"
        | "rejected"
        | "taken_down"
      finding_sender: "gc_support" | "globee"
      finding_severity: "high" | "low"
      finding_source: "validator" | "ai"
      finding_status: "open" | "resolved"
      finance_job_kind: "ingest" | "map" | "close" | "export"
      finance_job_status: "queued" | "running" | "succeeded" | "failed"
      finance_period_status: "open" | "closed"
      gc_role:
        | "gc_account_owner"
        | "gc_accountant"
        | "gc_legal"
        | "gc_delivery_ops"
        | "gc_viewer"
      group_status: "active" | "hidden" | "closed"
      group_visibility: "public" | "private" | "secret"
      ledger_entry_kind:
        | "opening"
        | "recoup"
        | "adjustment"
        | "sale"
        | "payable"
        | "closing"
      like_target: "post" | "comment" | "story_item"
      membership_status: "invited" | "active" | "removed"
      notification_kind: "title_rejected" | "delivery_update" | "new_follower"
      notification_sender: "gc_support" | "globee" | "member"
      org_role:
        | "account_owner"
        | "accountant"
        | "legal"
        | "delivery_ops"
        | "viewer"
      org_status:
        | "registered"
        | "awaiting_payment"
        | "active"
        | "payment_lapsed"
        | "closed"
      portal_event:
        | "room_viewed"
        | "otp_sent"
        | "otp_verified"
        | "download"
        | "restore_requested"
      point_reason:
        | "post_liked"
        | "comment_liked"
        | "answer_accepted"
        | "course_completed"
        | "event_attended"
        | "streak_milestone"
        | "referral"
        | "onboarding"
        | "manual"
        | "post_created"
      portal_link_purpose: "master_download" | "screener_view"
      post_status: "active" | "hidden" | "removed"
      social_music_scan_status: "pending" | "allowed" | "blocked"
      social_music_scan_surface: "post" | "story" | "welcome"
      release_type: "new_release" | "re_release"
      review_decision: "approve" | "reject"
      sales_import_status: "queued" | "received" | "mapped"
      rights_type:
        | "theatrical"
        | "fta"
        | "basic_cable"
        | "pay_tv"
        | "dth_satellite"
        | "ppv"
        | "pvod"
        | "svod"
        | "hvod"
        | "tvod"
        | "est"
        | "avod"
        | "fast"
        | "fvod"
        | "bvod"
        | "non_theatrical"
        | "hospitality"
        | "edu"
        | "ppl"
        | "home_video"
        | "mod"
      screener_event: "play" | "pause" | "seek" | "progress" | "ended"
      security_event_kind:
        | "sign_in"
        | "sign_out"
        | "failed_sign_in"
        | "invite_sent"
        | "invite_accepted"
        | "invite_withdrawn"
        | "role_change"
      screener_source: "master" | "dedicated"
      term_trigger_enum:
        | "signup"
        | "upgrade"
        | "downgrade"
        | "lapse"
        | "renewal"
        | "reinstate"
      territory_mode: "world" | "include" | "exclude"
      tier_enum: "access" | "pro" | "premium"
      title_status:
        | "draft"
        | "submitted"
        | "in_review"
        | "in_delivery"
        | "live"
        | "takedown_requested"
        | "taken_down"
        | "archived"
      transcode_status:
        | "submitted"
        | "running"
        | "complete"
        | "failed"
        | "submit_failed"
      trust_state: "new" | "verified" | "trusted" | "restricted"
      user_role_in_group: "owner" | "admin" | "member"
      vendor_mode: "portal_upload" | "email"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      account_invite_kind: ["team", "house_grant"],
      account_invite_status: ["pending", "accepted", "revoked", "expired"],
      account_status: ["active", "deactivated", "pending_deletion", "erased"],
      entity_scope: ["all", "selected"],
      entity_status: ["active", "archived"],
      entity_type: [
        "sole_prop",
        "llc",
        "corporation",
        "partnership",
        "trust",
        "nonprofit",
        "individual",
        "other",
      ],
      app_role: ["member", "moderator", "admin"],
      asset_kind: [
        "master",
        "caption",
        "artwork",
        "screener",
        "poster",
        "banner",
        "trailer",
      ],
      conversation_kind: ["direct", "group"],
      conversation_role: ["user", "globee"],
      conversation_thumb: ["up", "down"],
      course_encode_status: [
        "submitted",
        "running",
        "complete",
        "failed",
        "submit_failed",
      ],
      course_status: ["draft", "published", "archived"],
      delivery_status: [
        "pending",
        "delivered",
        "live",
        "rejected",
        "taken_down",
      ],
      finding_sender: ["gc_support", "globee"],
      finding_severity: ["high", "low"],
      finding_source: ["validator", "ai"],
      finding_status: ["open", "resolved"],
      finance_job_kind: ["ingest", "map", "close", "export"],
      finance_job_status: ["queued", "running", "succeeded", "failed"],
      finance_period_status: ["open", "closed"],
      gc_role: [
        "gc_account_owner",
        "gc_accountant",
        "gc_legal",
        "gc_delivery_ops",
        "gc_viewer",
      ],
      group_status: ["active", "hidden", "closed"],
      group_visibility: ["public", "private", "secret"],
      ledger_entry_kind: [
        "opening",
        "recoup",
        "adjustment",
        "sale",
        "payable",
        "closing",
      ],
      like_target: ["post", "comment", "story_item"],
      membership_status: ["invited", "active", "removed"],
      notification_kind: ["title_rejected", "delivery_update", "new_follower"],
      notification_sender: ["gc_support", "globee", "member"],
      org_role: [
        "account_owner",
        "accountant",
        "legal",
        "delivery_ops",
        "viewer",
      ],
      org_status: [
        "registered",
        "awaiting_payment",
        "active",
        "payment_lapsed",
        "closed",
      ],
      point_reason: [
        "post_liked",
        "comment_liked",
        "answer_accepted",
        "course_completed",
        "event_attended",
        "streak_milestone",
        "referral",
        "onboarding",
        "manual",
        "post_created",
      ],
      portal_event: [
        "room_viewed",
        "otp_sent",
        "otp_verified",
        "download",
        "restore_requested",
      ],
      portal_link_purpose: ["master_download", "screener_view"],
      post_status: ["active", "hidden", "removed"],
      social_music_scan_status: ["pending", "allowed", "blocked"],
      social_music_scan_surface: ["post", "story", "welcome"],
      release_type: ["new_release", "re_release"],
      review_decision: ["approve", "reject"],
      sales_import_status: ["queued", "received", "mapped"],
      rights_type: [
        "theatrical",
        "fta",
        "basic_cable",
        "pay_tv",
        "dth_satellite",
        "ppv",
        "pvod",
        "svod",
        "hvod",
        "tvod",
        "est",
        "avod",
        "fast",
        "fvod",
        "bvod",
        "non_theatrical",
        "hospitality",
        "edu",
        "ppl",
        "home_video",
        "mod",
      ],
      screener_event: ["play", "pause", "seek", "progress", "ended"],
      security_event_kind: [
        "sign_in",
        "sign_out",
        "failed_sign_in",
        "invite_sent",
        "invite_accepted",
        "invite_withdrawn",
        "role_change",
      ],
      screener_source: ["master", "dedicated"],
      term_trigger_enum: [
        "signup",
        "upgrade",
        "downgrade",
        "lapse",
        "renewal",
        "reinstate",
      ],
      territory_mode: ["world", "include", "exclude"],
      tier_enum: ["access", "pro", "premium"],
      title_status: [
        "draft",
        "submitted",
        "in_review",
        "in_delivery",
        "live",
        "takedown_requested",
        "taken_down",
        "archived",
      ],
      transcode_status: [
        "submitted",
        "running",
        "complete",
        "failed",
        "submit_failed",
      ],
      trust_state: ["new", "verified", "trusted", "restricted"],
      user_role_in_group: ["owner", "admin", "member"],
      vendor_mode: ["portal_upload", "email"],
    },
  },
} as const

