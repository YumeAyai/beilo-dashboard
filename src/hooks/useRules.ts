import { useState, useEffect, useCallback, useRef } from 'react';
import { rulesApi, RULE_TEMPLATES } from '../services/api';
import type { Rule, RuleTemplate, RuleQueryParams, RuleCreateInput, RuleGroup, IngressInfo } from '../services/api';

export function useRules(initialParams?: RuleQueryParams) {
  const [rules, setRules] = useState<Rule[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [params, setParams] = useState<RuleQueryParams>(initialParams || { page: 1, pageSize: 25 });
  const requestVersion = useRef(0);
  const inFlight = useRef(0);

  const fetchRules = useCallback(async (background = false) => {
    if (background && inFlight.current > 0) return;
    const version = ++requestVersion.current;
    inFlight.current += 1;
    if (!background) setLoading(true);
    setError(null);
    try {
      const result = await rulesApi.getRules(params);
      if (version !== requestVersion.current) return;
      const lastPage = Math.max(1, Math.ceil(result.total / (params.pageSize || 25)));
      if ((params.page || 1) > lastPage) {
        setParams(previous => ({ ...previous, page: lastPage }));
        return;
      }
      setRules(result.rules);
      setTotal(result.total);
    } catch (err) {
      if (version !== requestVersion.current) return;
      setError(err instanceof Error ? err.message : 'Failed to fetch rules');
    } finally {
      inFlight.current -= 1;
      if (version === requestVersion.current) setLoading(false);
    }
  }, [params]);

  const latestFetch = useRef(fetchRules);
  useEffect(() => {
    latestFetch.current = fetchRules;
    const versionRef = requestVersion;
    let active = true;
    let timer: ReturnType<typeof setTimeout>;
    const poll = async (background = false) => {
      await fetchRules(background);
      if (active) timer = setTimeout(() => { void poll(true); }, 5000);
    };
    void poll();
    return () => { active = false; clearTimeout(timer); versionRef.current += 1; };
  }, [fetchRules]);

  const refresh = useCallback(() => fetchRules(), [fetchRules]);

  const createRule = useCallback(async (rule: RuleCreateInput) => {
    await rulesApi.createRule(rule);
    await latestFetch.current();
  }, []);

  const updateRule = useCallback(async (id: string, rule: Partial<RuleCreateInput>) => {
    await rulesApi.updateRule(id, rule);
    await latestFetch.current();
  }, []);

  const deleteRule = useCallback(async (id: string) => {
    await rulesApi.deleteRule(id);
    await latestFetch.current();
  }, []);

  const enableRules = useCallback(async (ids: string[]) => {
    await rulesApi.enableRules(ids);
    await latestFetch.current();
  }, []);

  const disableRules = useCallback(async (ids: string[]) => {
    await rulesApi.disableRules(ids);
    await latestFetch.current();
  }, []);

  const deleteRules = useCallback(async (ids: string[]) => {
    await rulesApi.deleteRules(ids);
    await latestFetch.current();
  }, []);

  return {
    rules,
    total,
    loading,
    error,
    params,
    setParams,
    refresh,
    createRule,
    updateRule,
    deleteRule,
    enableRules,
    disableRules,
    deleteRules,
  };
}

export function useRuleTemplates() {
  const [templates, setTemplates] = useState<RuleTemplate[]>(RULE_TEMPLATES);
  const [loading, setLoading] = useState(false);

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const result = await rulesApi.getTemplates();
      setTemplates(result);
    } catch {
      // Use local preset templates on error
    } finally {
      setLoading(false);
    }
  }, []);

  const applyTemplate = useCallback(async (templateId: string, target?: { service?: string; namespace?: string }) => {
    return rulesApi.applyTemplate(templateId, target);
  }, []);

  return {
    templates,
    loading,
    refresh: fetchTemplates,
    applyTemplate,
  };
}

export function useRuleGroups() {
  const [groups, setGroups] = useState<RuleGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchGroups = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await rulesApi.getRuleGroups();
      setGroups(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch rule groups');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  return {
    groups,
    loading,
    error,
    refresh: fetchGroups,
  };
}

export function useIngresses() {
  const [ingresses, setIngresses] = useState<IngressInfo[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchIngresses = useCallback(async () => {
    setLoading(true);
    try {
      const result = await rulesApi.listIngresses();
      setIngresses(result);
    } catch {
      setIngresses([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchIngresses();
  }, [fetchIngresses]);

  return { ingresses, loading, refresh: fetchIngresses };
}
