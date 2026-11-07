// 规则动作类型
export type RuleAction = 'block' | 'allow' | 'pass' | 'log' | 'redirect' | 'drop' | 'status';

// 规则类型
export type RuleType = '正则' | '字符串' | '变量' | '条件' | '链式';

// 威胁等级
export type ThreatLevel = 'critical' | 'high' | 'medium' | 'low' | 'info';

// 规则状态
export type RuleStatus = 'enabled' | 'disabled' | 'testing';

// 规则处理阶段
export type RulePhase = 'early' | 'request' | 'response';

// 规则条件操作符
export type ConditionOperator = 'eq' | 'ne' | 'contains' | 'matches' | 'startsWith' | 'endsWith' | 'gt' | 'lt' | 'regex';

// 规则条件
export interface RuleCondition {
  operator: ConditionOperator;
  variable: string;
  value: string | number;
  negate?: boolean;
}

// 规则
export interface Rule {
  id: string;
  name: string;
  description?: string;
  type: RuleType;
  phase?: RulePhase;
  action: RuleAction;
  severity: ThreatLevel;
  category: string;
  enabled: boolean;
  conditions: RuleCondition[];
  transformations?: string[];
  // Ingress 绑定
  targetIngress?: string;
  targetGateway?: string;
  targetNamespace?: string;
  deployment?: {
    state: 'unbound' | 'desired' | 'accepted' | 'observed' | 'blocked' | 'error' | 'unknown' | 'retired';
    desiredRevision?: string;
    acceptedRevision?: string;
    observedRevision?: string;
    reason?: string;
    checkedAt?: string;
    enforcementVerified: boolean;
  };
  metadata: {
    createdAt: string;
    updatedAt: string;
    createdBy?: string;
    version: number;
    tags?: string[];
  };
  stats?: {
    matchCount: number;
    lastMatched?: string;
  };
}

// 规则组
export interface RuleGroup {
  id: string;
  name: string;
  description?: string;
  rules: string[];
  enabled: boolean;
  priority: number;
}

// 规则模板
export interface RuleTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  rule: Omit<Rule, 'id' | 'metadata' | 'stats'>;
  tags: string[];
  applicableScenarios: string[];
}

// 规则查询参数
export interface RuleQueryParams {
  page?: number;
  pageSize?: 10 | 25 | 50 | 100;
  category?: string;
  severity?: ThreatLevel;
  status?: RuleStatus;
  search?: string;
  sortBy?: 'name' | 'severity' | 'createdAt' | 'matchCount';
  sortOrder?: 'asc' | 'desc';
  // Ingress 筛选
  namespace?: string;
  ingress?: string;
  gateway?: string;
}

// 规则创建输入
export interface RuleCreateInput {
  name: string;
  description?: string;
  type: RuleType;
  phase?: RulePhase;
  action: RuleAction;
  severity: ThreatLevel;
  category: string;
  conditions: RuleCondition[];
  transformations?: string[];
  tags?: string[];
  targetIngress?: string;
  targetGateway?: string;
  targetNamespace?: string;
}

// 规则更新输入
export interface RuleUpdateInput extends Partial<RuleCreateInput> {
  enabled?: boolean;
}

// 规则测试输入
export interface RuleTestInput {
  ruleId?: string;
  rule?: RuleCreateInput;
  request: {
    method: string;
    path: string;
    headers?: Record<string, string>;
    body?: string;
    query?: Record<string, string>;
  };
}

// 规则测试结果
export interface RuleTestResult {
  matched: boolean;
  matchedRules: string[];
  action: RuleAction;
  details: Array<{
    ruleId: string;
    ruleName: string;
    condition: string;
    matched: boolean;
  }>;
  processingTime: number;
}

// 规则分页响应
export interface RuleListResponse {
  rules: Rule[];
  total: number;
  page: number;
  pageSize: number;
}

// 规则导入/导出
export interface RuleImportResult {
  imported: number;
  errors: number;
  details?: string[];
}

// OWASP规则集
export interface OWASPRuleSet {
  id: string;
  name: string;
  version: string;
  description: string;
  ruleCount: number;
  categories: string[];
}
