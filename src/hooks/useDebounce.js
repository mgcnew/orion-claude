import { useEffect, useState } from 'react';

/**
 * Retorna um valor que só atualiza após `delay` ms sem nova mudança.
 * Útil para campos de busca que disparam queries — evita uma request por keystroke.
 *
 * Exemplo:
 *   const [q, setQ] = useState('');
 *   const debouncedQ = useDebounce(q, 300);
 *   useEffect(() => { fetch(debouncedQ) }, [debouncedQ]);
 */
export function useDebounce(value, delay = 300) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);

  return debounced;
}
