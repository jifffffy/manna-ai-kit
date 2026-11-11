const DEFAULT_COMMANDS = ["./mvnw -q -DskipTests compile", "./mvnw -q test"];

export const ROUTE_DETAILS = {
  "urbot-bootstrap": {
    skills: ["urbot-discovery", "urbot-profile"],
    targetFiles: [
      "src/main/java/com/embabel/bot/<botname>/<BotName>Configuration.java",
      "src/main/java/com/embabel/bot/<botname>/<BotName>Tools.java",
      "src/main/java/com/embabel/bot/<botname>/<BotName>Agent.java",
      "src/main/resources/application-<botname>.properties",
      "src/main/resources/prompts/personas/<botname>.jinja",
      "src/main/resources/prompts/objectives/<botname>.jinja",
      "src/main/resources/prompts/behaviours/<botname>.jinja"
    ],
    verificationCommands: DEFAULT_COMMANDS
  },
  "urbot-profile-change": {
    skills: ["urbot-discovery", "urbot-profile", "urbot-prompt", "urbot-verification"],
    targetFiles: [
      "src/main/java/com/embabel/bot/<botname>/<BotName>Configuration.java",
      "src/main/resources/application-<botname>.properties",
      "src/main/resources/prompts/personas/<botname>.jinja",
      "src/main/resources/prompts/objectives/<botname>.jinja"
    ],
    verificationCommands: DEFAULT_COMMANDS
  },
  "urbot-prompt-tuning": {
    skills: ["urbot-discovery", "urbot-prompt"],
    targetFiles: [
      "src/main/resources/prompts/personas/<botname>.jinja",
      "src/main/resources/prompts/objectives/<botname>.jinja",
      "src/main/resources/prompts/behaviours/<botname>.jinja"
    ],
    verificationCommands: DEFAULT_COMMANDS
  },
  "urbot-tool-development": {
    skills: ["urbot-discovery", "urbot-tool"],
    targetFiles: [
      "src/main/java/com/embabel/bot/<botname>/<BotName>Tools.java",
      "src/main/java/com/embabel/bot/<botname>/<BotName>Configuration.java"
    ],
    verificationCommands: DEFAULT_COMMANDS
  },
  "urbot-domain-memory": {
    skills: ["urbot-discovery", "urbot-domain-memory"],
    targetFiles: [
      "src/main/java/com/embabel/bot/<botname>/domain/",
      "src/main/resources/application-<botname>.properties"
    ],
    verificationCommands: DEFAULT_COMMANDS
  },
  "urbot-verification": {
    skills: ["urbot-discovery", "urbot-verification"],
    targetFiles: [],
    verificationCommands: DEFAULT_COMMANDS
  }
};

export const ROUTE_IDS = Object.keys(ROUTE_DETAILS);

const INTENT_WORDS = {
  prompt: ["persona", "objective", "behaviour", "behavior", "prompt", "人格", "目标", "行为", "提示词"],
  tool: ["tool", "mcp", "subagent", "reference", "integrate", "external api", "webhook", "工具", "接入", "子代理"],
  domainMemory: ["namedentity", "named entity", "relation", "memory", "domain", "实体", "关系", "记忆", "领域"],
  profile: ["profile"],
  verification: ["test", "compile", "regression", "verify", "verification", "build", "测试", "编译", "回归", "验证"]
};

export function routeRequest({ directoryExists, request, discovery = {} }) {
  if (!directoryExists) return detail("urbot-bootstrap", discovery);

  const text = String(request ?? "").toLowerCase();
  const matches = [];
  const profileCreation = isProfileCreation(text);
  if (isBootstrap(text)) matches.push("urbot-bootstrap");
  if (!profileCreation && hasAny(text, INTENT_WORDS.prompt)) matches.push("urbot-prompt-tuning");
  if (hasAny(text, INTENT_WORDS.tool)) matches.push("urbot-tool-development");
  if (hasAny(text, INTENT_WORDS.domainMemory)) matches.push("urbot-domain-memory");
  if (profileCreation || hasAny(text, INTENT_WORDS.profile)) matches.push("urbot-profile-change");
  if (hasAny(text, INTENT_WORDS.verification)) matches.push("urbot-verification");

  const unique = [...new Set(matches)];
  if (unique.length === 0) {
    return question(
      "Which Urbot change do you want: bootstrap, profile, prompt, tool, domain/memory, or verification?"
    );
  }
  if (unique.length > 1) {
    return question(`This request spans ${unique.join(" and ")}; which should I do first?`);
  }
  return detail(unique[0], discovery);
}

function isBootstrap(text) {
  const explicit =
    /\b(new project|new bot|new urbot bot|create a bot|create a new bot|create a new urbot bot|bootstrap|scaffold|initialize|start a new project|start a new bot)\b/;
  if (explicit.test(text)) return true;
  if (/创建.*(项目|应用|工程)|新建.*(项目|应用|工程)|新项目|搭建/.test(text)) return true;
  return (
    /\b(create|start|initialize)\b/.test(text) &&
    /\b(project|bot)\b/.test(text) &&
    !/\b(tool|mcp|subagent|reference|persona|objective|behaviour|behavior|profile|memory|relation|namedentity|test|compile)\b/.test(
      text
    )
  );
}

function isProfileCreation(text) {
  const creation = /\b(create|new|add)\b/.test(text) || /创建|新建|新增/.test(text);
  const noun = /\b(assistant|profile)\b/.test(text) || /助手|机器人|智能体/.test(text);
  return creation && noun;
}

function hasAny(text, words) {
  return words.some((word) => {
    if (/[\u4e00-\u9fff]/.test(word)) return text.includes(word);
    return new RegExp(`\\b${escapeRegExp(word)}\\b`, "i").test(text);
  });
}

function detail(route, discovery) {
  const meta = ROUTE_DETAILS[route];
  const profile = discovery.targetProfile ?? null;
  const fill = (value) => {
    if (!profile) return value;
    const botName = toPascal(profile);
    return value.replaceAll("<profile>", profile).replaceAll("<botname>", profile).replaceAll("<BotName>", botName);
  };
  return {
    route,
    skills: [...meta.skills],
    targetFiles: meta.targetFiles.map(fill),
    verificationCommands: [...meta.verificationCommands],
    question: null
  };
}

function question(message) {
  return {
    route: null,
    skills: [],
    targetFiles: [],
    verificationCommands: [],
    question: message
  };
}

function toPascal(value) {
  return String(value)
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
