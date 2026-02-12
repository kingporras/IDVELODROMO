export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      app_settings: {
        Row: {
          created_at: string
          default_capacity: number
          id: string
          instagram_handle: string | null
          league_url: string | null
          payment_instructions: string | null
          team_url: string | null
        }
        Insert: {
          created_at?: string
          default_capacity?: number
          id?: string
          instagram_handle?: string | null
          league_url?: string | null
          payment_instructions?: string | null
          team_url?: string | null
        }
        Update: {
          created_at?: string
          default_capacity?: number
          id?: string
          instagram_handle?: string | null
          league_url?: string | null
          payment_instructions?: string | null
          team_url?: string | null
        }
        Relationships: []
      }
      convocation_responses: {
        Row: {
          convocation_id: string
          id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          convocation_id: string
          id?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          convocation_id?: string
          id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "convocation_responses_convocation_id_fkey"
            columns: ["convocation_id"]
            isOneToOne: false
            referencedRelation: "convocations"
            referencedColumns: ["id"]
          },
        ]
      }
      convocations: {
        Row: {
          capacity: number
          created_at: string
          id: string
          last_payment_email_sent_at: string | null
          last_reminder_sent_at: string | null
          match_id: string
          reset_at: string | null
          status: string
        }
        Insert: {
          capacity?: number
          created_at?: string
          id?: string
          last_payment_email_sent_at?: string | null
          last_reminder_sent_at?: string | null
          match_id: string
          reset_at?: string | null
          status?: string
        }
        Update: {
          capacity?: number
          created_at?: string
          id?: string
          last_payment_email_sent_at?: string | null
          last_reminder_sent_at?: string | null
          match_id?: string
          reset_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "convocations_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: true
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
        ]
      }
      lineups: {
        Row: {
          created_at: string
          id: string
          match_id: string
          position: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          match_id: string
          position: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          match_id?: string
          position?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lineups_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
        ]
      }
      match_stats: {
        Row: {
          assists: number
          created_at: string
          goals: number
          id: string
          match_id: string
          red_cards: number
          user_id: string
          yellow_cards: number
        }
        Insert: {
          assists?: number
          created_at?: string
          goals?: number
          id?: string
          match_id: string
          red_cards?: number
          user_id: string
          yellow_cards?: number
        }
        Update: {
          assists?: number
          created_at?: string
          goals?: number
          id?: string
          match_id?: string
          red_cards?: number
          user_id?: string
          yellow_cards?: number
        }
        Relationships: [
          {
            foreignKeyName: "match_stats_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
        ]
      }
      matches: {
        Row: {
          away_team: string
          city: string
          created_at: string
          formation: string | null
          highlights_note: string | null
          home_team: string
          id: string
          league_name: string
          location_name: string
          match_date: string
          notes: string | null
          result_text: string | null
        }
        Insert: {
          away_team: string
          city?: string
          created_at?: string
          formation?: string | null
          highlights_note?: string | null
          home_team: string
          id?: string
          league_name?: string
          location_name?: string
          match_date: string
          notes?: string | null
          result_text?: string | null
        }
        Update: {
          away_team?: string
          city?: string
          created_at?: string
          formation?: string | null
          highlights_note?: string | null
          home_team?: string
          id?: string
          league_name?: string
          location_name?: string
          match_date?: string
          notes?: string | null
          result_text?: string | null
        }
        Relationships: []
      }
      mvp_votes: {
        Row: {
          created_at: string
          id: string
          match_id: string
          voted_user_id: string
          voter_user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          match_id: string
          voted_user_id: string
          voter_user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          match_id?: string
          voted_user_id?: string
          voter_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mvp_votes_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_cycles: {
        Row: {
          amount: number
          created_at: string
          id: string
          month_key: string
        }
        Insert: {
          amount?: number
          created_at?: string
          id?: string
          month_key: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          month_key?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          cycle_id: string | null
          id: string
          note: string | null
          paid_at: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cycle_id?: string | null
          id?: string
          note?: string | null
          paid_at?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cycle_id?: string | null
          id?: string
          note?: string | null
          paid_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "payment_cycles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string
          dorsal: number
          email: string | null
          id: string
          username: string
        }
        Insert: {
          created_at?: string
          display_name: string
          dorsal: number
          email?: string | null
          id: string
          username: string
        }
        Update: {
          created_at?: string
          display_name?: string
          dorsal?: number
          email?: string | null
          id?: string
          username?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      videos: {
        Row: {
          created_at: string
          date: string
          id: string
          match_id: string | null
          title: string
          vimeo_url: string
        }
        Insert: {
          created_at?: string
          date?: string
          id?: string
          match_id?: string | null
          title: string
          vimeo_url: string
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          match_id?: string | null
          title?: string
          vimeo_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "videos_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "jugador"
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
  public: {
    Enums: {
      app_role: ["admin", "jugador"],
    },
  },
} as const
