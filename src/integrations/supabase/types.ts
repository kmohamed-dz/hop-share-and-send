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
      blocked_users: {
        Row: {
          blocked_user_id: string
          blocker_user_id: string
          created_at: string
          id: string
        }
        Insert: {
          blocked_user_id: string
          blocker_user_id: string
          created_at?: string
          id?: string
        }
        Update: {
          blocked_user_id?: string
          blocker_user_id?: string
          created_at?: string
          id?: string
        }
        Relationships: []
      }
      deal_delivery_codes: {
        Row: {
          code_plain: string
          created_at: string
          deal_id: string
        }
        Insert: {
          code_plain: string
          created_at?: string
          deal_id: string
        }
        Update: {
          code_plain?: string
          created_at?: string
          deal_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "deal_delivery_codes_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: true
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
        ]
      }
      deals: {
        Row: {
          created_at: string
          delivered_at: string | null
          delivery_code_consumed: boolean | null
          delivery_code_hash: string | null
          delivery_place_set_at: string | null
          delivery_place_text: string | null
          id: string
          message: string | null
          owner_confirmed_delivery: boolean | null
          owner_confirmed_pickup: boolean | null
          owner_user_id: string
          parcel_request_id: string | null
          pickup_confirmed_at: string | null
          pickup_photo_url: string | null
          sender_confirmed: boolean | null
          status: string
          traveler_confirmed_delivery: boolean | null
          traveler_confirmed_pickup: boolean | null
          traveler_user_id: string
          trip_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          delivered_at?: string | null
          delivery_code_consumed?: boolean | null
          delivery_code_hash?: string | null
          delivery_place_set_at?: string | null
          delivery_place_text?: string | null
          id?: string
          message?: string | null
          owner_confirmed_delivery?: boolean | null
          owner_confirmed_pickup?: boolean | null
          owner_user_id: string
          parcel_request_id?: string | null
          pickup_confirmed_at?: string | null
          pickup_photo_url?: string | null
          sender_confirmed?: boolean | null
          status?: string
          traveler_confirmed_delivery?: boolean | null
          traveler_confirmed_pickup?: boolean | null
          traveler_user_id: string
          trip_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          delivered_at?: string | null
          delivery_code_consumed?: boolean | null
          delivery_code_hash?: string | null
          delivery_place_set_at?: string | null
          delivery_place_text?: string | null
          id?: string
          message?: string | null
          owner_confirmed_delivery?: boolean | null
          owner_confirmed_pickup?: boolean | null
          owner_user_id?: string
          parcel_request_id?: string | null
          pickup_confirmed_at?: string | null
          pickup_photo_url?: string | null
          sender_confirmed?: boolean | null
          status?: string
          traveler_confirmed_delivery?: boolean | null
          traveler_confirmed_pickup?: boolean | null
          traveler_user_id?: string
          trip_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "deals_parcel_request_id_fkey"
            columns: ["parcel_request_id"]
            isOneToOne: false
            referencedRelation: "parcel_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          created_at: string
          deal_id: string
          id: string
          sender_id: string
        }
        Insert: {
          content: string
          created_at?: string
          deal_id: string
          id?: string
          sender_id: string
        }
        Update: {
          content?: string
          created_at?: string
          deal_id?: string
          id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
        ]
      }
      parcel_requests: {
        Row: {
          category: string
          created_at: string
          date_window_end: string
          date_window_start: string
          destination_wilaya: string
          forbidden_items_acknowledged: boolean | null
          id: string
          notes: string | null
          origin_wilaya: string
          photo_url: string | null
          reward_dzd: number | null
          size_weight: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category: string
          created_at?: string
          date_window_end: string
          date_window_start: string
          destination_wilaya: string
          forbidden_items_acknowledged?: boolean | null
          id?: string
          notes?: string | null
          origin_wilaya: string
          photo_url?: string | null
          reward_dzd?: number | null
          size_weight?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          date_window_end?: string
          date_window_start?: string
          destination_wilaya?: string
          forbidden_items_acknowledged?: boolean | null
          id?: string
          notes?: string | null
          origin_wilaya?: string
          photo_url?: string | null
          reward_dzd?: number | null
          size_weight?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          deliveries_count: number | null
          id: string
          name: string
          phone: string
          photo_url: string | null
          rating_avg: number | null
          rating_count: number | null
          role_preference: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          deliveries_count?: number | null
          id?: string
          name: string
          phone?: string
          photo_url?: string | null
          rating_avg?: number | null
          rating_count?: number | null
          role_preference?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          deliveries_count?: number | null
          id?: string
          name?: string
          phone?: string
          photo_url?: string | null
          rating_avg?: number | null
          rating_count?: number | null
          role_preference?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ratings: {
        Row: {
          comment: string | null
          created_at: string
          deal_id: string
          from_user_id: string
          id: string
          stars: number
          to_user_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          deal_id: string
          from_user_id: string
          id?: string
          stars: number
          to_user_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          deal_id?: string
          from_user_id?: string
          id?: string
          stars?: number
          to_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ratings_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          created_at: string
          deal_id: string | null
          details: string | null
          id: string
          reason: string
          reporter_user_id: string
          status: string
          target_user_id: string
        }
        Insert: {
          created_at?: string
          deal_id?: string | null
          details?: string | null
          id?: string
          reason: string
          reporter_user_id: string
          status?: string
          target_user_id: string
        }
        Update: {
          created_at?: string
          deal_id?: string | null
          details?: string | null
          id?: string
          reason?: string
          reporter_user_id?: string
          status?: string
          target_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
        ]
      }
      trips: {
        Row: {
          accepted_categories: string[] | null
          capacity_note: string | null
          created_at: string
          departure_date: string
          destination_wilaya: string
          id: string
          origin_wilaya: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          accepted_categories?: string[] | null
          capacity_note?: string | null
          created_at?: string
          departure_date: string
          destination_wilaya: string
          id?: string
          origin_wilaya: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          accepted_categories?: string[] | null
          capacity_note?: string | null
          created_at?: string
          departure_date?: string
          destination_wilaya?: string
          id?: string
          origin_wilaya?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_settings: {
        Row: {
          created_at: string
          language: string
          notifications_enabled: boolean
          theme: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          language?: string
          notifications_enabled?: boolean
          theme?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          language?: string
          notifications_enabled?: boolean
          theme?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      expire_old_posts: { Args: never; Returns: undefined }
      has_active_deal: { Args: never; Returns: boolean }
      verify_delivery_code: {
        Args: { p_code: string; p_deal_id: string }
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
    Enums: {},
  },
} as const
