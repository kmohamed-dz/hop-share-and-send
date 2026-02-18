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
      deals: {
        Row: {
          accepted_at: string | null
          closed_at: string | null
          created_at: string
          delivered_at: string | null
          delivery_confirmed_at: string | null
          id: string
          owner_confirmed_delivery: boolean | null
          owner_confirmed_pickup: boolean | null
          owner_user_id: string
          parcel_request_id: string | null
          payment_status: string
          pickup_confirmed_at: string | null
          pickup_point_address: string | null
          pickup_point_set_at: string | null
          sender_accepted_at: string | null
          status: string
          status_updated_at: string
          traveler_accepted_at: string | null
          traveler_confirmed_delivery: boolean | null
          traveler_confirmed_pickup: boolean | null
          traveler_user_id: string
          trip_id: string | null
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          closed_at?: string | null
          created_at?: string
          delivered_at?: string | null
          delivery_confirmed_at?: string | null
          id?: string
          owner_confirmed_delivery?: boolean | null
          owner_confirmed_pickup?: boolean | null
          owner_user_id: string
          parcel_request_id?: string | null
          payment_status?: string
          pickup_confirmed_at?: string | null
          pickup_point_address?: string | null
          pickup_point_set_at?: string | null
          sender_accepted_at?: string | null
          status?: string
          status_updated_at?: string
          traveler_accepted_at?: string | null
          traveler_confirmed_delivery?: boolean | null
          traveler_confirmed_pickup?: boolean | null
          traveler_user_id: string
          trip_id?: string | null
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          closed_at?: string | null
          created_at?: string
          delivered_at?: string | null
          delivery_confirmed_at?: string | null
          id?: string
          owner_confirmed_delivery?: boolean | null
          owner_confirmed_pickup?: boolean | null
          owner_user_id?: string
          parcel_request_id?: string | null
          payment_status?: string
          pickup_confirmed_at?: string | null
          pickup_point_address?: string | null
          pickup_point_set_at?: string | null
          sender_accepted_at?: string | null
          status?: string
          status_updated_at?: string
          traveler_accepted_at?: string | null
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
          delivery_point_address: string | null
          delivery_point_type: string | null
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
          delivery_point_address?: string | null
          delivery_point_type?: string | null
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
          delivery_point_address?: string | null
          delivery_point_type?: string | null
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
          full_name: string | null
          id: string
          is_admin: boolean
          language_preference: string
          name: string
          national_id: string | null
          phone: string
          photo_url: string | null
          preferred_language: string
          profile_complete: boolean
          rating_avg: number | null
          rating_count: number | null
          role_preference: string
          updated_at: string
          user_id: string
          wilaya_code: string | null
          wilaya_name: string | null
          wilaya: string | null
        }
        Insert: {
          created_at?: string
          deliveries_count?: number | null
          full_name?: string | null
          id?: string
          is_admin?: boolean
          language_preference?: string
          name: string
          national_id?: string | null
          phone?: string
          photo_url?: string | null
          preferred_language?: string
          profile_complete?: boolean
          rating_avg?: number | null
          rating_count?: number | null
          role_preference?: string
          updated_at?: string
          user_id: string
          wilaya_code?: string | null
          wilaya_name?: string | null
          wilaya?: string | null
        }
        Update: {
          created_at?: string
          deliveries_count?: number | null
          full_name?: string | null
          id?: string
          is_admin?: boolean
          language_preference?: string
          name?: string
          national_id?: string | null
          phone?: string
          photo_url?: string | null
          preferred_language?: string
          profile_complete?: boolean
          rating_avg?: number | null
          rating_count?: number | null
          role_preference?: string
          updated_at?: string
          user_id?: string
          wilaya_code?: string | null
          wilaya_name?: string | null
          wilaya?: string | null
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_get_deals: {
        Args: { p_limit?: number; p_offset?: number }
        Returns: {
          created_at: string
          id: string
          owner_user_id: string
          status: string
          traveler_user_id: string
        }[]
      }
      admin_get_messages: {
        Args: { p_limit?: number; p_offset?: number }
        Returns: {
          created_at: string
          deal_id: string
          id: string
          sender_id: string
        }[]
      }
      admin_get_parcels: {
        Args: { p_limit?: number; p_offset?: number }
        Returns: {
          created_at: string
          destination_wilaya: string
          id: string
          origin_wilaya: string
          status: string
          user_id: string
        }[]
      }
      admin_get_stats: {
        Args: Record<PropertyKey, never>
        Returns: {
          deals_accepted_by_sender: number
          deals_accepted_by_traveler: number
          deals_closed: number
          deals_delivered: number
          deals_mutually_accepted: number
          deals_pickup_confirmed: number
          deals_proposed: number
          total_auth_users: number
          total_deals: number
          total_messages: number
          total_parcels: number
          total_profiles: number
          total_trips: number
        }[]
      }
      admin_get_trips: {
        Args: { p_limit?: number; p_offset?: number }
        Returns: {
          created_at: string
          departure_date: string
          destination_wilaya: string
          id: string
          origin_wilaya: string
          status: string
          user_id: string
        }[]
      }
      admin_get_users: {
        Args: { p_limit?: number; p_offset?: number }
        Returns: {
          created_at: string
          email: string | null
          email_confirmed: boolean
          is_admin: boolean
          profile_complete: boolean
          user_id: string
          wilaya: string | null
        }[]
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
