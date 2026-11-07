// ============== Rule Types ==============
export type RuleAction = 'block' | 'allow' | 'pass' | 'log' | 'redirect' | 'drop' | 'status';
export type RuleType = '正则' | '字符串' | '变量' | '条件' | '链式';
export type ThreatLevel = 'critical' | 'high' | 'medium' | 'low' | 'info';
export type RulePhase = 'early' | 'request' | 'response';
export type ConditionOperator = 'eq' | 'ne' | 'contains' | 'matches' | 'startsWith' | 'endsWith' | 'gt' | 'lt' | 'regex';

export interface RuleCondition {
  operator: ConditionOperator;
  variable: string;
  value: string | number;
  negate?: boolean;
}

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
  metadata: { createdAt: string; updatedAt: string; createdBy?: string; version: number; tags?: string[] };
  stats?: { matchCount: number; lastMatched?: string };
}

export interface RuleGroup {
  id: string;
  name: string;
  description?: string;
  rules: string[];
  enabled: boolean;
  priority: number;
}

export interface RuleTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  rule: Omit<Rule, 'id' | 'metadata' | 'stats'>;
  tags: string[];
  applicableScenarios: string[];
}

export interface RuleQueryParams {
  page?: number;
  pageSize?: 10 | 25 | 50 | 100;
  category?: string;
  severity?: ThreatLevel;
  status?: 'enabled' | 'disabled' | 'testing';
  search?: string;
  sortBy?: 'name' | 'severity' | 'createdAt' | 'matchCount';
  sortOrder?: 'asc' | 'desc';
  namespace?: string;
  ingress?: string;
  gateway?: string;
}

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

export interface RuleUpdateInput extends Partial<RuleCreateInput> {
  enabled?: boolean;
}

export interface RuleTestInput {
  ruleId?: string;
  rule?: RuleCreateInput;
  request: { method: string; path: string; headers?: Record<string, string>; body?: string; query?: Record<string, string> };
}

export interface RuleTestResult {
  matched: boolean;
  matchedRules: string[];
  action: RuleAction;
  details: Array<{ ruleId: string; ruleName: string; condition: string; matched: boolean }>;
  processingTime: number;
}

export interface RuleListResponse {
  rules: Rule[];
  total: number;
  page: number;
  pageSize: number;
}

export interface RuleImportResult {
  imported: number;
  errors: number;
  details?: string[];
}

export interface IngressInfo {
  name: string;
  namespace: string;
  hosts: string[];
  wafEnabled: boolean;
}

export interface OWASPRuleSet {
  id: string;
  name: string;
  version: string;
  description: string;
  ruleCount: number;
  categories: string[];
}

// ============== OWASP CRS规则集配置 ==============

export const OWASP_RULESETS: OWASPRuleSet[] = [
  {
    id: 'crs_941',
    name: 'OWASP CRS v4.x',
    version: '4.0.0',
    description: 'OWASP ModSecurity Core Rule Set v4.0.0',
    ruleCount: 200,
    categories: ['SQL注入', 'XSS', '命令注入', '文件包含', '信息泄露'],
  },
  {
    id: 'crs_930',
    name: '攻击协议规则',
    version: '3.3',
    description: '针对HTTP协议异常的攻击检测',
    ruleCount: 50,
    categories: ['协议违规', '请求走私'],
  },
  {
    id: 'crs_913',
    name: '扫描检测规则',
    version: '3.3',
    description: '检测自动化扫描工具',
    ruleCount: 30,
    categories: ['扫描器', 'Bot'],
  },
];

// ============== 预设规则模板 ==============

export const RULE_TEMPLATES: RuleTemplate[] = [
  {
    id: 'template-sql-injection',
    name: 'SQL注入检测',
    description: '检测常见的SQL注入攻击模式',
    category: 'SQL注入',
    tags: ['OWASP', 'SQL注入', '关键'],
    applicableScenarios: ['所有场景'],
    rule: {
      name: 'SQL注入检测',
      description: '检测常见的SQL注入攻击模式',
      type: '正则',
      phase: 'request',
      action: 'block',
      severity: 'critical',
      category: 'SQL注入',
      enabled: false,
      conditions: [
        { operator: 'matches', variable: 'REQUEST_BODY', value: "(?i)(\\b(select|insert|update|delete|drop|create|alter|exec|execute)\\b)" },
        { operator: 'matches', variable: 'REQUEST_BODY', value: "(['\"`];|--|\\/\\*|\\*\\/)" },
        { operator: 'matches', variable: 'QUERY_STRING', value: "(?i)(\\b(or|and)\\b.*=|--|union|select)" },
      ],
    },
  },
  {
    id: 'template-xss',
    name: 'XSS攻击检测',
    description: '检测跨站脚本攻击',
    category: 'XSS',
    tags: ['OWASP', 'XSS', '关键'],
    applicableScenarios: ['所有场景'],
    rule: {
      name: 'XSS攻击检测',
      description: '检测常见的XSS攻击模式',
      type: '正则',
      phase: 'request',
      action: 'block',
      severity: 'high',
      category: 'XSS',
      enabled: false,
      conditions: [
        { operator: 'matches', variable: 'REQUEST_BODY', value: "(?i)<script[^>]*>.*?</script>" },
        { operator: 'matches', variable: 'REQUEST_BODY', value: "(?i)javascript:" },
        { operator: 'matches', variable: 'REQUEST_BODY', value: "(?i)on\\w+\\s*=" },
        { operator: 'matches', variable: 'REQUEST_BODY', value: "(?i)<iframe[^>]*>" },
        { operator: 'matches', variable: 'REQUEST_BODY', value: "(?i)expression\\s*\\(" },
      ],
    },
  },
  {
    id: 'template-command-injection',
    name: '命令注入检测',
    description: '检测系统命令注入攻击',
    category: '命令注入',
    tags: ['OWASP', '命令注入', '关键'],
    applicableScenarios: ['所有场景'],
    rule: {
      name: '命令注入检测',
      description: '检测系统命令注入攻击',
      type: '正则',
      phase: 'request',
      action: 'block',
      severity: 'critical',
      category: '命令注入',
      enabled: false,
      conditions: [
        { operator: 'matches', variable: 'REQUEST_BODY', value: "(?i)(;|\\||`|\\$\\(|\\$\\{).*(whoami|ls|cat|ping|wget|curl|nc)" },
        { operator: 'matches', variable: 'QUERY_STRING', value: "(?i)(;|\\||`|\\$\\(|\\$\\{).*(whoami|ls|cat|ping|wget|curl|nc)" },
      ],
    },
  },
  {
    id: 'template-path-traversal',
    name: '路径遍历检测',
    description: '检测目录遍历攻击',
    category: '路径遍历',
    tags: ['OWASP', '路径遍历', '关键'],
    applicableScenarios: ['所有场景'],
    rule: {
      name: '路径遍历检测',
      description: '检测目录遍历攻击',
      type: '正则',
      phase: 'request',
      action: 'block',
      severity: 'high',
      category: '路径遍历',
      enabled: false,
      conditions: [
        { operator: 'matches', variable: 'REQUEST_URI', value: "(?i)(\\.\\./|\\.\\.\\\\)" },
        { operator: 'matches', variable: 'REQUEST_URI', value: "(?i)%2e%2e" },
        { operator: 'matches', variable: 'REQUEST_URI', value: "(?i)(etc/passwd|boot.ini|win.ini)" },
      ],
    },
  },
  {
    id: 'template-file-upload',
    name: '恶意文件上传检测',
    description: '检测恶意文件上传',
    category: '文件上传',
    tags: ['OWASP', '文件上传', '关键'],
    applicableScenarios: ['上传接口'],
    rule: {
      name: '恶意文件上传检测',
      description: '检测恶意文件上传',
      type: '正则',
      phase: 'request',
      action: 'block',
      severity: 'critical',
      category: '文件上传',
      enabled: false,
      conditions: [
        { operator: 'matches', variable: 'FILES', value: "(?i)(\\.php|\\.asp|\\.jsp|\\.exe|\\.bat|\\.sh)" },
        { operator: 'matches', variable: 'FILES', value: "(?i)(eval\\s*\\(|base64_decode|shell_exec)" },
      ],
    },
  },
  {
    id: 'template-sensitive-files',
    name: '敏感文件访问检测',
    description: '检测敏感文件访问',
    category: '信息泄露',
    tags: ['OWASP', '信息泄露', '关键'],
    applicableScenarios: ['所有场景'],
    rule: {
      name: '敏感文件访问检测',
      description: '检测敏感文件访问',
      type: '正则',
      phase: 'request',
      action: 'block',
      severity: 'medium',
      category: '信息泄露',
      enabled: false,
      conditions: [
        { operator: 'matches', variable: 'REQUEST_URI', value: "(?i)(/\\.env|/\\.git|/config\\.php|/wp-config\\.php)" },
        { operator: 'matches', variable: 'REQUEST_URI', value: "(?i)(/etc/passwd|/etc/shadow|/proc/self/environ)" },
      ],
    },
  },
  {
    id: 'template-scanner',
    name: '扫描器检测',
    description: '检测自动化扫描工具',
    category: '扫描器',
    tags: ['Bot', '扫描器'],
    applicableScenarios: ['所有场景'],
    rule: {
      name: '扫描器检测',
      description: '检测常见扫描工具的User-Agent',
      type: '字符串',
      phase: 'request',
      action: 'block',
      severity: 'medium',
      category: '扫描器',
      enabled: false,
      conditions: [
        { operator: 'contains', variable: 'USER_AGENT', value: 'Nmap' },
        { operator: 'contains', variable: 'USER_AGENT', value: 'Nikto' },
        { operator: 'contains', variable: 'USER_AGENT', value: 'Sqlmap' },
        { operator: 'contains', variable: 'USER_AGENT', value: 'Burp' },
        { operator: 'contains', variable: 'USER_AGENT', value: 'Acunetix' },
        { operator: 'contains', variable: 'USER_AGENT', value: 'Nessus' },
        { operator: 'contains', variable: 'USER_AGENT', value: 'Python-urllib' },
        { operator: 'contains', variable: 'USER_AGENT', value: 'httpclient' },
      ],
    },
  },
];
