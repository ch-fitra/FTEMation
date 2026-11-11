import { useEffect, useState } from "react";
import { api, errorMessages } from "../lib/http";
import type { User } from "../types/auth";

export function useSession() {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [errors, setErrors] = useState<string[]>([]);
    useEffect(() => {
        api.get("/api/user")
            .then(({ data }) => setUser(data.user))
            .catch((err) => {
                if (err.response?.status !== 401) setErrors(errorMessages(err));
            })
            .finally(() => setLoading(false));
        const interceptor = api.interceptors.response.use(
            (response) => response,
            (error) => {
                if (error.response?.status === 401) setUser(null);
                return Promise.reject(error);
            },
        );
        return () => api.interceptors.response.eject(interceptor);
    }, []);
    return { user, setUser, loading, errors };
}
