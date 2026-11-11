export interface ImportItem {
    id: number;
    filename: string;
    status: "pending" | "imported" | "failed";
    created_at: string;
    activities_count?: number;
    employees_count?: number;
    warnings: string[] | null;
}
export interface Department {
    department: string;
    activities_count: number;
    employees_count: number;
    total_fte: number;
}
export interface Summary {
    calculation: {
        annual_capacity_minutes: number;
        annual_factors: Record<string, number>;
        saving_rates: Record<string, number>;
    };
    automation_levels?: Record<string, number> | null;
    analysis_run_id?: number | null;
    activities_count: number;
    employees_count: number;
    departments_count: number;
    total_fte: number;
    departments: Department[];
    analysis_status: string;
    estimated_fte_saving: number | null;
    remaining_fte: number | null;
    warnings: string[];
}
export interface Activity {
    id: number;
    activity_code: string;
    activity_name: string;
    description: string;
    frequency: string;
    volume: string;
    duration_minutes: string;
    fte: string;
    employee: { name: string; employee_code: string; department: string };
}
