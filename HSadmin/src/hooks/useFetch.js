import { useCallback, useEffect, useState } from "react";

export function useFetch(loader) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const payload = await loader();
      setData(payload);
      return payload;
    } catch (err) {
      setError(err.message || "Unable to load data.");
      return null;
    } finally {
      setLoading(false);
    }
  }, [loader]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
  }, [refresh]);

  return { data, error, loading, refresh };
}
