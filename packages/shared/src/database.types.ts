export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
	graphql_public: {
		Tables: {
			[_ in never]: never;
		};
		Views: {
			[_ in never]: never;
		};
		Functions: {
			graphql: { Args: { extensions?: Json; operationName?: string; query?: string; variables?: Json }; Returns: Json };
		};
		Enums: {
			[_ in never]: never;
		};
		CompositeTypes: {
			[_ in never]: never;
		};
	};
	public: {
		Tables: {
			appointments: {
				Row: {
					client_id: string | null;
					client_name: string;
					created_at: string;
					duration_minutes: number;
					id: string;
					motorcycle_model: string | null;
					scheduled_date: string;
					service: string | null;
					start_time: string;
					updated_at: string;
				};
				ComputedFields: never;
				Insert: {
					client_id?: string | null;
					client_name: string;
					created_at?: string;
					duration_minutes?: number;
					id?: string;
					motorcycle_model?: string | null;
					scheduled_date: string;
					service?: string | null;
					start_time: string;
					updated_at?: string;
				};
				Update: {
					client_id?: string | null;
					client_name?: string;
					created_at?: string;
					duration_minutes?: number;
					id?: string;
					motorcycle_model?: string | null;
					scheduled_date?: string;
					service?: string | null;
					start_time?: string;
					updated_at?: string;
				};
				Relationships: [
					{
						foreignKeyName: 'appointments_client_id_fkey';
						columns: ['client_id'];
						isOneToOne: false;
						referencedRelation: 'clients';
						referencedColumns: ['id'];
					},
				];
			};
			cash_entries: {
				Row: {
					amount: number;
					created_at: string;
					description: string;
					entry_date: string;
					id: string;
					kind: string;
					notes: string | null;
					updated_at: string;
				};
				ComputedFields: never;
				Insert: {
					amount: number;
					created_at?: string;
					description: string;
					entry_date?: string;
					id?: string;
					kind: string;
					notes?: string | null;
					updated_at?: string;
				};
				Update: {
					amount?: number;
					created_at?: string;
					description?: string;
					entry_date?: string;
					id?: string;
					kind?: string;
					notes?: string | null;
					updated_at?: string;
				};
				Relationships: [];
			};
			cash_settings: {
				Row: {
					id: number;
					opening_balance: number;
					opening_date: string;
					updated_at: string;
				};
				ComputedFields: never;
				Insert: {
					id?: number;
					opening_balance?: number;
					opening_date?: string;
					updated_at?: string;
				};
				Update: {
					id?: number;
					opening_balance?: number;
					opening_date?: string;
					updated_at?: string;
				};
				Relationships: [];
			};
			clients: {
				Row: {
					address: string | null;
					created_at: string;
					document: string;
					id: string;
					name: string;
					phone: string;
					updated_at: string;
				};
				ComputedFields: never;
				Insert: {
					address?: string | null;
					created_at?: string;
					document: string;
					id?: string;
					name: string;
					phone: string;
					updated_at?: string;
				};
				Update: {
					address?: string | null;
					created_at?: string;
					document?: string;
					id?: string;
					name?: string;
					phone?: string;
					updated_at?: string;
				};
				Relationships: [];
			};
			design_settings: {
				Row: {
					background_color: string;
					border_color: string;
					border_radius: string;
					font_family: string;
					id: number;
					instagram: string | null;
					logo: string | null;
					phone: string | null;
					primary_color: string;
					secondary_color: string;
					shop_name: string;
					subtitle: string | null;
					surface_color: string;
					text_color: string;
					updated_at: string;
					whatsapp: string | null;
				};
				ComputedFields: never;
				Insert: {
					background_color?: string;
					border_color?: string;
					border_radius?: string;
					font_family?: string;
					id?: number;
					instagram?: string | null;
					logo?: string | null;
					phone?: string | null;
					primary_color?: string;
					secondary_color?: string;
					shop_name?: string;
					subtitle?: string | null;
					surface_color?: string;
					text_color?: string;
					updated_at?: string;
					whatsapp?: string | null;
				};
				Update: {
					background_color?: string;
					border_color?: string;
					border_radius?: string;
					font_family?: string;
					id?: number;
					instagram?: string | null;
					logo?: string | null;
					phone?: string | null;
					primary_color?: string;
					secondary_color?: string;
					shop_name?: string;
					subtitle?: string | null;
					surface_color?: string;
					text_color?: string;
					updated_at?: string;
					whatsapp?: string | null;
				};
				Relationships: [];
			};
			motorcycles: {
				Row: {
					client_id: string;
					color: string;
					created_at: string;
					id: string;
					model: string;
					plate: string;
					updated_at: string;
				};
				ComputedFields: never;
				Insert: {
					client_id: string;
					color: string;
					created_at?: string;
					id?: string;
					model: string;
					plate: string;
					updated_at?: string;
				};
				Update: {
					client_id?: string;
					color?: string;
					created_at?: string;
					id?: string;
					model?: string;
					plate?: string;
					updated_at?: string;
				};
				Relationships: [
					{
						foreignKeyName: 'motorcycles_client_id_fkey';
						columns: ['client_id'];
						isOneToOne: false;
						referencedRelation: 'clients';
						referencedColumns: ['id'];
					},
				];
			};
			part_movements: {
				Row: {
					created_at: string;
					id: string;
					kind: string;
					movement_date: string;
					notes: string | null;
					part_id: string | null;
					part_name: string;
					quantity: number;
					total: number | null;
					unit_cost: number;
					unit_price: number;
				};
				ComputedFields: never;
				Insert: {
					created_at?: string;
					id?: string;
					kind: string;
					movement_date?: string;
					notes?: string | null;
					part_id?: string | null;
					part_name: string;
					quantity: number;
					total?: never;
					unit_cost?: number;
					unit_price: number;
				};
				Update: {
					created_at?: string;
					id?: string;
					kind?: string;
					movement_date?: string;
					notes?: string | null;
					part_id?: string | null;
					part_name?: string;
					quantity?: number;
					total?: never;
					unit_cost?: number;
					unit_price?: number;
				};
				Relationships: [
					{
						foreignKeyName: 'part_movements_part_id_fkey';
						columns: ['part_id'];
						isOneToOne: false;
						referencedRelation: 'parts';
						referencedColumns: ['id'];
					},
				];
			};
			parts: {
				Row: {
					created_at: string;
					id: string;
					motorcycle_model: string | null;
					name: string;
					profit_margin: number | null;
					purchase_date: string;
					purchase_price: number;
					quantity: number;
					sale_price: number;
					updated_at: string;
					year_end: number | null;
					year_start: number | null;
				};
				ComputedFields: never;
				Insert: {
					created_at?: string;
					id?: string;
					motorcycle_model?: string | null;
					name: string;
					profit_margin?: never;
					purchase_date?: string;
					purchase_price?: number;
					quantity?: number;
					sale_price?: number;
					updated_at?: string;
					year_end?: number | null;
					year_start?: number | null;
				};
				Update: {
					created_at?: string;
					id?: string;
					motorcycle_model?: string | null;
					name?: string;
					profit_margin?: never;
					purchase_date?: string;
					purchase_price?: number;
					quantity?: number;
					sale_price?: number;
					updated_at?: string;
					year_end?: number | null;
					year_start?: number | null;
				};
				Relationships: [];
			};
			service_order_items: {
				Row: {
					created_at: string;
					id: string;
					position: number;
					price: number;
					service_id: string;
					service_name: string;
					service_order_id: string;
				};
				ComputedFields: never;
				Insert: {
					created_at?: string;
					id?: string;
					position?: number;
					price: number;
					service_id: string;
					service_name: string;
					service_order_id: string;
				};
				Update: {
					created_at?: string;
					id?: string;
					position?: number;
					price?: number;
					service_id?: string;
					service_name?: string;
					service_order_id?: string;
				};
				Relationships: [
					{
						foreignKeyName: 'service_order_items_service_id_fkey';
						columns: ['service_id'];
						isOneToOne: false;
						referencedRelation: 'services';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'service_order_items_service_order_id_fkey';
						columns: ['service_order_id'];
						isOneToOne: false;
						referencedRelation: 'service_orders';
						referencedColumns: ['id'];
					},
				];
			};
			service_orders: {
				Row: {
					client_id: string;
					completed_at: string | null;
					created_at: string;
					customer_notes: string | null;
					down_payment: number;
					estimated_time: string | null;
					id: string;
					installments: number | null;
					mileage: number | null;
					motorcycle_id: string;
					notes: string | null;
					number: number;
					order_date: string;
					payment_method: string;
					status: string;
					total: number;
					updated_at: string;
					work_estimate_minutes: number | null;
					work_seconds: number;
					work_started_at: string | null;
				};
				ComputedFields: never;
				Insert: {
					client_id: string;
					completed_at?: string | null;
					created_at?: string;
					customer_notes?: string | null;
					down_payment?: number;
					estimated_time?: string | null;
					id?: string;
					installments?: number | null;
					mileage?: number | null;
					motorcycle_id: string;
					notes?: string | null;
					number?: never;
					order_date?: string;
					payment_method?: string;
					status?: string;
					total?: number;
					updated_at?: string;
					work_estimate_minutes?: number | null;
					work_seconds?: number;
					work_started_at?: string | null;
				};
				Update: {
					client_id?: string;
					completed_at?: string | null;
					created_at?: string;
					customer_notes?: string | null;
					down_payment?: number;
					estimated_time?: string | null;
					id?: string;
					installments?: number | null;
					mileage?: number | null;
					motorcycle_id?: string;
					notes?: string | null;
					number?: never;
					order_date?: string;
					payment_method?: string;
					status?: string;
					total?: number;
					updated_at?: string;
					work_estimate_minutes?: number | null;
					work_seconds?: number;
					work_started_at?: string | null;
				};
				Relationships: [
					{
						foreignKeyName: 'service_orders_client_id_fkey';
						columns: ['client_id'];
						isOneToOne: false;
						referencedRelation: 'clients';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'service_orders_motorcycle_id_fkey';
						columns: ['motorcycle_id'];
						isOneToOne: false;
						referencedRelation: 'motorcycles';
						referencedColumns: ['id'];
					},
				];
			};
			services: {
				Row: {
					active: boolean;
					created_at: string;
					id: string;
					name: string;
					updated_at: string;
				};
				ComputedFields: never;
				Insert: {
					active?: boolean;
					created_at?: string;
					id?: string;
					name: string;
					updated_at?: string;
				};
				Update: {
					active?: boolean;
					created_at?: string;
					id?: string;
					name?: string;
					updated_at?: string;
				};
				Relationships: [];
			};
		};
		Views: {
			[_ in never]: never;
		};
		Functions: {
			adjust_part_quantity: {
				Args: { p_delta: number; p_id: string };
				Returns: {
					created_at: string;
					id: string;
					motorcycle_model: string | null;
					name: string;
					profit_margin: number | null;
					purchase_date: string;
					purchase_price: number;
					quantity: number;
					sale_price: number;
					updated_at: string;
					year_end: number | null;
					year_start: number | null;
				};
				SetofOptions: {
					from: '*';
					to: 'parts';
					isOneToOne: true;
					isSetofReturn: false;
				};
			};
			cancel_part_sale: {
				Args: { p_movement_id: string };
				Returns: {
					created_at: string;
					id: string;
					motorcycle_model: string | null;
					name: string;
					profit_margin: number | null;
					purchase_date: string;
					purchase_price: number;
					quantity: number;
					sale_price: number;
					updated_at: string;
					year_end: number | null;
					year_start: number | null;
				};
				SetofOptions: {
					from: '*';
					to: 'parts';
					isOneToOne: true;
					isSetofReturn: false;
				};
			};
			cash_balance_at: { Args: { p_date: string }; Returns: number };
			cash_flows: {
				Args: { p_end: string; p_start: string };
				Returns: {
					amount: number;
					cost: number;
					created_at: string;
					description: string;
					entry_date: string;
					part_id: string;
					quantity: number;
					ref_id: string;
					source: string;
				}[];
			};
			financial_statement: {
				Args: { p_end: string; p_start: string };
				Returns: {
					amount: number;
					created_at: string;
					description: string;
					entry_date: string;
					part_id: string;
					ref_id: string;
					source: string;
				}[];
			};
			financial_summary: { Args: { p_end: string; p_start: string }; Returns: Json };
			local_today: { Args: Record<PropertyKey, never>; Returns: string };
			pause_service_order_timer: {
				Args: { p_id: string };
				Returns: {
					client_id: string;
					completed_at: string | null;
					created_at: string;
					customer_notes: string | null;
					down_payment: number;
					estimated_time: string | null;
					id: string;
					installments: number | null;
					mileage: number | null;
					motorcycle_id: string;
					notes: string | null;
					number: number;
					order_date: string;
					payment_method: string;
					status: string;
					total: number;
					updated_at: string;
					work_estimate_minutes: number | null;
					work_seconds: number;
					work_started_at: string | null;
				};
				SetofOptions: {
					from: '*';
					to: 'service_orders';
					isOneToOne: true;
					isSetofReturn: false;
				};
			};
			save_client: { Args: { p_client: Json; p_id: string; p_motorcycles: Json; p_removed_motorcycles?: string[] }; Returns: string };
			save_service_order: { Args: { p_items: Json; p_order: Json }; Returns: string };
			search_clients: {
				Args: { p_term?: string };
				Returns: {
					address: string | null;
					created_at: string;
					document: string;
					id: string;
					name: string;
					phone: string;
					updated_at: string;
				}[];
				SetofOptions: {
					from: '*';
					to: 'clients';
					isOneToOne: false;
					isSetofReturn: true;
				};
			};
			search_parts: {
				Args: { p_term?: string };
				Returns: {
					created_at: string;
					id: string;
					motorcycle_model: string | null;
					name: string;
					profit_margin: number | null;
					purchase_date: string;
					purchase_price: number;
					quantity: number;
					sale_price: number;
					updated_at: string;
					year_end: number | null;
					year_start: number | null;
				}[];
				SetofOptions: {
					from: '*';
					to: 'parts';
					isOneToOne: false;
					isSetofReturn: true;
				};
			};
			search_service_orders: {
				Args: { p_status?: string; p_term?: string };
				Returns: {
					client_id: string;
					completed_at: string | null;
					created_at: string;
					customer_notes: string | null;
					down_payment: number;
					estimated_time: string | null;
					id: string;
					installments: number | null;
					mileage: number | null;
					motorcycle_id: string;
					notes: string | null;
					number: number;
					order_date: string;
					payment_method: string;
					status: string;
					total: number;
					updated_at: string;
					work_estimate_minutes: number | null;
					work_seconds: number;
					work_started_at: string | null;
				}[];
				SetofOptions: {
					from: '*';
					to: 'service_orders';
					isOneToOne: false;
					isSetofReturn: true;
				};
			};
			sell_part: {
				Args: { p_date: string; p_notes?: string; p_part_id: string; p_quantity: number; p_unit_price: number };
				Returns: {
					created_at: string;
					id: string;
					kind: string;
					movement_date: string;
					notes: string | null;
					part_id: string | null;
					part_name: string;
					quantity: number;
					total: number | null;
					unit_cost: number;
					unit_price: number;
				};
				SetofOptions: {
					from: '*';
					to: 'part_movements';
					isOneToOne: true;
					isSetofReturn: false;
				};
			};
			set_service_order_work_time: {
				Args: { p_id: string; p_seconds: number };
				Returns: {
					client_id: string;
					completed_at: string | null;
					created_at: string;
					customer_notes: string | null;
					down_payment: number;
					estimated_time: string | null;
					id: string;
					installments: number | null;
					mileage: number | null;
					motorcycle_id: string;
					notes: string | null;
					number: number;
					order_date: string;
					payment_method: string;
					status: string;
					total: number;
					updated_at: string;
					work_estimate_minutes: number | null;
					work_seconds: number;
					work_started_at: string | null;
				};
				SetofOptions: {
					from: '*';
					to: 'service_orders';
					isOneToOne: true;
					isSetofReturn: false;
				};
			};
			start_service_order_timer: {
				Args: { p_id: string };
				Returns: {
					client_id: string;
					completed_at: string | null;
					created_at: string;
					customer_notes: string | null;
					down_payment: number;
					estimated_time: string | null;
					id: string;
					installments: number | null;
					mileage: number | null;
					motorcycle_id: string;
					notes: string | null;
					number: number;
					order_date: string;
					payment_method: string;
					status: string;
					total: number;
					updated_at: string;
					work_estimate_minutes: number | null;
					work_seconds: number;
					work_started_at: string | null;
				};
				SetofOptions: {
					from: '*';
					to: 'service_orders';
					isOneToOne: true;
					isSetofReturn: false;
				};
			};
		};
		Enums: {
			[_ in never]: never;
		};
		CompositeTypes: {
			[_ in never]: never;
		};
	};
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>];

export type Tables<
	DefaultSchemaTableNameOrOptions extends
		keyof (DefaultSchema['Tables'] & DefaultSchema['Views']) | { schema: keyof DatabaseWithoutInternals },
	TableName extends (DefaultSchemaTableNameOrOptions extends {
		schema: keyof DatabaseWithoutInternals;
	}
		? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
				DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
		: never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
	? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
			DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
			Row: infer R;
		}
		? R
		: never
	: DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
		? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
				Row: infer R;
			}
			? R
			: never
		: never;

export type TablesInsert<
	DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
	TableName extends (DefaultSchemaTableNameOrOptions extends {
		schema: keyof DatabaseWithoutInternals;
	}
		? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
		: never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
	? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
			Insert: infer I;
		}
		? I
		: never
	: DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
		? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
				Insert: infer I;
			}
			? I
			: never
		: never;

export type TablesUpdate<
	DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
	TableName extends (DefaultSchemaTableNameOrOptions extends {
		schema: keyof DatabaseWithoutInternals;
	}
		? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
		: never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
	? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
			Update: infer U;
		}
		? U
		: never
	: DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
		? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
				Update: infer U;
			}
			? U
			: never
		: never;

export type Enums<
	DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums'] | { schema: keyof DatabaseWithoutInternals },
	EnumName extends (DefaultSchemaEnumNameOrOptions extends {
		schema: keyof DatabaseWithoutInternals;
	}
		? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
		: never) = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
	? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
	: DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
		? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
		: never;

export type CompositeTypes<
	PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes'] | { schema: keyof DatabaseWithoutInternals },
	CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
		schema: keyof DatabaseWithoutInternals;
	}
		? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
		: never) = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
	? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
	: PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
		? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
		: never;

export const Constants = {
	graphql_public: {
		Enums: {},
	},
	public: {
		Enums: {},
	},
} as const;
