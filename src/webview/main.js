import { computed, createApp, defineComponent, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from "vue";
import { createRouter, createWebHashHistory, useRoute, useRouter } from "vue-router";
import ElementPlus, { ElMessage } from "element-plus";
import "element-plus/dist/index.css";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { SearchAddon } from "@xterm/addon-search";
import { WebLinksAddon } from "@xterm/addon-web-links";
import { WebglAddon } from "@xterm/addon-webgl";
import "@xterm/xterm/css/xterm.css";
import "./styles.css";

const vscode = typeof acquireVsCodeApi !== "undefined" ? acquireVsCodeApi() : null;

function createBus() {
  const listeners = new Map();
  const pending = new Map();
  const receive = ({ data }) => {
    if (!data || !data.type) return;
    console.log("[bus:recv]", data.type, data.content);
    const handlers = listeners.get(data.type);
    if (handlers && handlers.size > 0) {
      handlers.forEach((handler) => handler(data.content));
    } else {
      console.log("[bus:pending]", data.type);
      pending.set(data.type, data.content);
    }
  };
  const flushPending = (type) => {
    if (pending.has(type)) {
      const handlers = listeners.get(type);
      if (handlers && handlers.size > 0) {
        console.log("[bus:flush]", type);
        handlers.forEach((handler) => handler(pending.get(type)));
        pending.delete(type);
      }
    }
  };
  window.addEventListener("message", receive);
  return {
    on(type, handler) {
      const handlers = listeners.get(type) || new Set();
      handlers.add(handler);
      listeners.set(type, handlers);
      console.log("[bus:on]", type, "handlers:", handlers.size);
      flushPending(type);
      return () => handlers.delete(handler);
    },
    emit(type, content) {
      console.log("[bus:emit]", type, content);
      if (vscode) vscode.postMessage({ type, content });
    },
    dispose() {
      window.removeEventListener("message", receive);
      listeners.clear();
      pending.clear();
    },
  };
}

const bus = createBus();

function clone(value) {
  return JSON.parse(JSON.stringify(value || {}));
}

function objectValues(value) {
  if (Array.isArray(value)) return value;
  if (value && typeof value === "object") return Object.keys(value).map((key) => value[key]);
  return [];
}

function groupName(item) {
  return item?.name || item?.title || item?.id || item;
}

function generateId() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

function defaultConnection(kind) {
  if (kind === "ftp") {
    return {
      id: generateId(),
      name: "default",
      group: "default",
      status: 1,
      description: "desc",
      ftp: { host: "127.0.0.1", port: 21, user: "root", password: "", secure: false },
    };
  }
  return {
    id: generateId(),
    name: "default",
    group: "default",
    status: 1,
    description: "desc",
    ssh: {
      host: "127.0.0.1",
      port: 22,
      username: "root",
      ostype: "linux",
      password: "",
      privates: "",
      privateKey: "",
      passphrase: "",
    },
  };
}

function normalizeConnection(kind, value) {
  return Object.assign(defaultConnection(kind), clone(value));
}

function vscodeTheme() {
  const style = document.documentElement.style;
  const get = (name, fallback) => style.getPropertyValue(name) || fallback;
  return {
    cursor: get("--vscode-editorCursor-foreground", "#ffffff"),
    selectionBackground: get("--vscode-editor-selectionBackground", "#264f78"),
    foreground: get("--vscode-terminal-foreground", "#cccccc"),
    background: get("--vscode-editor-background", "#1e1e1e"),
    black: get("--vscode-terminal-ansiBlack", "#000000"),
    red: get("--vscode-terminal-ansiRed", "#cd3131"),
    green: get("--vscode-terminal-ansiGreen", "#0dbc79"),
    yellow: get("--vscode-terminal-ansiYellow", "#e5e510"),
    blue: get("--vscode-terminal-ansiBlue", "#2472c8"),
    magenta: get("--vscode-terminal-ansiMagenta", "#bc3fbc"),
    cyan: get("--vscode-terminal-ansiCyan", "#11a8cd"),
    white: get("--vscode-terminal-ansiWhite", "#e5e5e5"),
  };
}

const EventPageMixin = {
  setup() {
    const route = useRoute();
    onMounted(() => bus.emit(`route-${route.name}`));
    watch(() => route.name, (name) => {
      if (name) bus.emit(`route-${name}`);
    });
    return { bus };
  },
};

const JsonPreview = defineComponent({
  props: { value: { type: null, default: null } },
  template: `<pre class="json-block">{{ JSON.stringify(value, null, 2) }}</pre>`,
});

const ConnectionPage = defineComponent({
  mixins: [EventPageMixin],
  components: { JsonPreview },
  props: {
    kind: { type: String, required: true },
    connectEvent: { type: String, required: true },
    saveEvent: { type: String, required: true },
  },
  setup(props) {
    const mode = ref("add");
    const titles = ref({});
    const groups = ref([]);
    const info = reactive(defaultConnection(props.kind));
    const conn = computed(() => (props.kind === "ftp" ? info.ftp : info.ssh));
    const testResult = ref(null);
    const applyIncoming = (payload) => {
      const incoming = clone(payload?.[`${props.kind}Info`]);
      const defaults = defaultConnection(props.kind);
      const key = props.kind === "ftp" ? "ftp" : "ssh";
      info.id = incoming?.id ?? defaults.id;
      info.name = incoming?.name ?? defaults.name;
      info.group = incoming?.group ?? defaults.group;
      info.status = incoming?.status ?? defaults.status;
      info.description = incoming?.description ?? defaults.description;
      if (incoming?.[key]) {
        Object.assign(info[key], incoming[key]);
      }
    };
    watch(() => props.kind, (newKind) => {
      const defaults = defaultConnection(newKind);
      Object.keys(defaults).forEach((key) => {
        info[key] = defaults[key];
      });
    });
    const disposers = [
      bus.on("add", (payload) => {
        mode.value = "add";
        titles.value = payload?.titles || {};
        groups.value = objectValues(payload?.groups);
        applyIncoming(payload);
      }),
      bus.on("edit", (payload) => {
        mode.value = "edit";
        titles.value = payload?.titles || {};
        groups.value = objectValues(payload?.groups);
        applyIncoming(payload);
      }),
      bus.on("CONNECTION_ERROR", (payload) => {
        testResult.value = { ok: false, msg: payload?.msg || "连接失败" };
      }),
      bus.on("CONNECTION_TEST_OK", (payload) => {
        testResult.value = { ok: true, msg: payload?.msg || "连接测试成功" };
      }),
    ];
    onBeforeUnmount(() => disposers.forEach((dispose) => dispose()));
    const submit = (eventName) => {
      const key = `${props.kind}Info`;
      const payload = { type: mode.value, [key]: clone(info) };
      testResult.value = null;
      bus.emit(eventName, payload);
    };
    const pageTitle = computed(() => {
      const label = mode.value === 'edit' ? '修改' : '添加';
      return `${props.kind.toUpperCase()} ${label}`;
    });
    return { mode, titles, groups, info, conn, testResult, submit, props, groupName, pageTitle };
  },
  template: `
    <main class="page">
      <header class="page-header">
        <h1 class="page-title">{{ pageTitle }}</h1>
        <span class="muted">{{ titles?.title || titles?.name || '' }}</span>
      </header>
      <section class="panel">
        <el-form :model="info" label-width="110px" label-position="right">
          <el-form-item label="名称"><el-input v-model="info.name" /></el-form-item>
          <el-form-item label="主机"><el-input v-model="conn.host" /></el-form-item>
          <el-form-item label="端口"><el-input-number v-model="conn.port" :min="1" :max="65535" /></el-form-item>
          <el-form-item label="用户" v-if="kind === 'ftp'"><el-input v-model="conn.user" /></el-form-item>
          <el-form-item label="用户" v-else><el-input v-model="conn.username" /></el-form-item>
          <el-form-item label="密码"><el-input v-model="conn.password" type="password" show-password /></el-form-item>
          <el-form-item label="分组">
            <el-select v-model="info.group" filterable allow-create default-first-option>
              <el-option v-for="item in groups" :key="groupName(item)" :label="groupName(item)" :value="groupName(item)" />
            </el-select>
          </el-form-item>
          <el-form-item label="描述"><el-input v-model="info.description" /></el-form-item>
          <el-form-item label="系统" v-if="kind === 'ssh'">
            <el-select v-model="conn.ostype">
              <el-option label="Linux" value="linux" />
              <el-option label="Windows" value="Windows_NT" />
              <el-option label="macOS" value="Darwin" />
            </el-select>
          </el-form-item>
          <el-form-item label="安全" v-if="kind === 'ftp'"><el-switch v-model="conn.secure" /></el-form-item>
          <el-form-item label="私钥" v-if="kind === 'ssh'"><el-input v-model="conn.privates" type="textarea" :rows="4" /></el-form-item>
          <el-form-item label="密钥密码" v-if="kind === 'ssh'"><el-input v-model="conn.passphrase" type="password" show-password /></el-form-item>
          <div class="actions">
            <el-button type="primary" @click="submit(saveEvent)">保存</el-button>
            <el-button @click="submit('CONNECT_SSH_INFO_TEST')">测试</el-button>
          </div>
        </el-form>
      </section>
      <section class="panel" v-if="testResult" :style="{ borderLeft: '3px solid ' + (testResult.ok ? '#4caf50' : '#f44336') }">
        <p style="margin:0" :style="{ color: testResult.ok ? '#4caf50' : '#f44336' }">{{ testResult.ok ? '连接成功' : '连接失败' }}</p>
        <p style="margin:4px 0 0; color: var(--vscode-descriptionForeground, #9d9d9d); font-size: 12px;">{{ testResult.msg }}</p>
      </section>
    </main>
  `,
});

function defaultManaged(kind) {
  if (kind === "remote") {
    return {
      name: "default",
      mode: 0,
      mark: false,
      status: false,
      rdp: { isFullScreen: false, port: 3389, colorDepth: 24, desktopGeometry: "1366x768" },
    };
  }
  return {
    name: "default",
    status: false,
    mark: false,
    forward: {
      type: 0,
      mode: 0,
      localHost: "127.0.0.1",
      localPort: 8888,
      remoteHost: "127.0.0.1",
      remotePort: 9999,
      bastionHost: "",
      bastionPort: 22,
    },
    description: "desc",
  };
}

const ManagerPage = defineComponent({
  mixins: [EventPageMixin],
  components: { JsonPreview },
  props: { kind: { type: String, required: true } },
  setup(props) {
    const modelKey = props.kind === "remote" ? "remote" : "forward";
    const titles = ref({});
    const sshvo = ref({});
    const rows = ref([]);
    const draft = reactive(defaultManaged(props.kind));
    const detailKey = props.kind === "remote" ? "rdp" : "forward";
    const disposers = [
      bus.on("show", (payload) => {
        titles.value = payload?.titles || {};
        sshvo.value = payload?.sshvo || {};
        rows.value = objectValues(payload?.sshvo?.[`${modelKey}s`] || payload?.sshvo?.[modelKey]);
      }),
      bus.on("new", (payload) => {
        Object.keys(draft).forEach((key) => delete draft[key]);
        Object.assign(draft, defaultManaged(props.kind), clone(payload?.[modelKey]));
      }),
      bus.on("success", () => ElMessage.success("操作成功")),
    ];
    watch(() => props.kind, () => {
      rows.value = [];
      Object.keys(draft).forEach((key) => delete draft[key]);
      Object.assign(draft, defaultManaged(props.kind));
    });
    onBeforeUnmount(() => disposers.forEach((dispose) => dispose()));
    const emitRow = (event, row = draft) => bus.emit(event, clone(row));
    return { titles, sshvo, rows, draft, detailKey, emitRow };
  },
  template: `
    <main class="page">
      <header class="page-header">
        <h1 class="page-title">{{ kind === 'remote' ? '远程桌面' : '端口转发' }}</h1>
        <el-button @click="emitRow('new')">新建</el-button>
      </header>
      <section class="panel">
        <el-form :model="draft" label-width="120px" label-position="right">
          <div class="grid">
            <el-form-item label="名称"><el-input v-model="draft.name" /></el-form-item>
            <el-form-item label="状态"><el-switch v-model="draft.status" /></el-form-item>
            <template v-if="kind === 'forward'">
              <el-form-item label="转发类型">
                <el-select v-model="draft.forward.type">
                  <el-option label="本地" :value="0" />
                  <el-option label="远程" :value="1" />
                  <el-option label="Socks5" :value="2" />
                </el-select>
              </el-form-item>
              <el-form-item label="模式">
                <el-select v-model="draft.forward.mode">
                  <el-option label="SSH2 转发" :value="0" />
                  <el-option label="本地 SSH 执行" :value="1" />
                </el-select>
              </el-form-item>
              <el-form-item label="本地主机"><el-input v-model="draft.forward.localHost" /></el-form-item>
              <el-form-item label="本地端口"><el-input-number v-model="draft.forward.localPort" :min="1" :max="65535" /></el-form-item>
              <el-form-item label="远程主机"><el-input v-model="draft.forward.remoteHost" /></el-form-item>
              <el-form-item label="远程端口"><el-input-number v-model="draft.forward.remotePort" :min="1" :max="65535" /></el-form-item>
            </template>
            <template v-else>
              <el-form-item label="模式">
                <el-select v-model="draft.mode">
                  <el-option label="RDP" :value="0" />
                  <el-option label="VNC" :value="1" />
                </el-select>
              </el-form-item>
              <el-form-item label="端口"><el-input-number v-model="draft.rdp.port" :min="1" :max="65535" /></el-form-item>
              <el-form-item label="全屏"><el-switch v-model="draft.rdp.isFullScreen" /></el-form-item>
              <el-form-item label="颜色深度"><el-input-number v-model="draft.rdp.colorDepth" :min="8" :max="32" /></el-form-item>
              <el-form-item label="分辨率"><el-input v-model="draft.rdp.desktopGeometry" /></el-form-item>
            </template>
          </div>
          <div class="actions">
            <el-button type="primary" @click="emitRow('insert')">添加</el-button>
            <el-button @click="emitRow('update')">保存草稿</el-button>
          </div>
        </el-form>
      </section>
      <section class="panel">
        <el-table :data="rows" empty-text="暂无数据">
          <el-table-column prop="name" label="名称" min-width="120" />
          <el-table-column label="本地" min-width="100">
            <template #default="{ row }">{{ row.forward?.localHost || '-' }}:{{ row.forward?.localPort || '-' }}</template>
          </el-table-column>
          <el-table-column label="远程" min-width="160">
            <template #default="{ row }">{{ kind === 'remote' ? ('RDP :' + (row.rdp?.port || '-')) : ((row.forward?.remoteHost || '-') + ':' + (row.forward?.remotePort || '-')) }}</template>
          </el-table-column>
          <el-table-column label="状态" width="100">
            <template #default="{ row }"><el-tag :type="row.status ? 'success' : 'info'">{{ row.status ? '运行中' : '已停止' }}</el-tag></template>
          </el-table-column>
          <el-table-column label="操作" width="260">
            <template #default="{ row }">
              <el-button size="small" @click="emitRow('start', row)">启动</el-button>
              <el-button size="small" @click="emitRow('stop', row)">停止</el-button>
              <el-button size="small" @click="emitRow('update', row)">保存</el-button>
              <el-button size="small" type="danger" @click="emitRow('remove', row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
        <div class="actions">
          <el-button @click="emitRow('load')">刷新</el-button>
        </div>
      </section>
    </main>
  `,
});

const WorkspacePage = defineComponent({
  mixins: [EventPageMixin],
  components: { JsonPreview },
  setup() {
    const sshvo = ref({});
    const titles = ref({});
    const workspaces = computed(() => objectValues(sshvo.value?.workspaces));
    const disposers = [bus.on("show", (payload) => {
      sshvo.value = payload?.sshvo || {};
      titles.value = payload?.titles || {};
    })];
    onBeforeUnmount(() => disposers.forEach((dispose) => dispose()));
    const emitWorkspace = (event, workspace) => bus.emit(event, { workspace: clone(workspace) });
    return { sshvo, titles, workspaces, emitWorkspace, bus };
  },
  template: `
    <main class="page">
      <header class="page-header">
        <h1 class="page-title">工作区</h1>
        <div class="actions">
          <el-button @click="bus.emit('CONNECT_SSH_INFO_REFRESH')">刷新</el-button>
        </div>
      </header>
      <section class="panel">
        <el-table :data="workspaces" empty-text="暂无工作区">
          <el-table-column prop="name" label="名称" min-width="140" />
          <el-table-column label="目录" min-width="240">
            <template #default="{ row }">{{ row.workspace?.dir || '-' }}</template>
          </el-table-column>
          <el-table-column prop="description" label="描述" min-width="160" />
          <el-table-column label="操作" width="180">
            <template #default="{ row }">
              <el-button size="small" @click="emitWorkspace('CONNECT_SSH_WORKSPACES_MODIFY', row)">重命名</el-button>
              <el-button size="small" type="danger" @click="emitWorkspace('CONNECT_SSH_WORKSPACES_DELETE', row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </section>
    </main>
  `,
});

const ConfigPage = defineComponent({
  mixins: [EventPageMixin],
  components: { JsonPreview },
  setup() {
    const configvos = ref({});
    const importText = ref("");
    const disposers = [
      bus.on("EXPORT", (payload) => { configvos.value = payload?.configvos || {}; }),
      bus.on("IMPORT", (payload) => {
        configvos.value = payload?.configvos || {};
        const count = Object.keys(configvos.value).length;
        ElMessage.success(`成功导入 ${count} 个连接配置`);
      }),
    ];
    onBeforeUnmount(() => disposers.forEach((dispose) => dispose()));
    const selectedKeys = ref([]);
    const configRows = computed(() => {
      const src = configvos.value || {};
      return Object.keys(src).map((key) => ({ ...src[key], _id: key }));
    });
    const allKeys = computed(() => configRows.value.map((item) => item._id).filter(Boolean));
    const isAllSelected = computed(() => allKeys.value.length > 0 && selectedKeys.value.length === allKeys.value.length);
    const toggleAll = () => {
      selectedKeys.value = isAllSelected.value ? [] : [...allKeys.value];
    };
    const getConfigLabel = (item) => {
      if (item.type === 'SSH') {
        const info = item.sshvo?.ssh;
        if (info) {
          const s = info.ssh || info;
          return `${info.name || s?.host || '未命名'} (${s?.username || '?'}@${s?.host || '?'}:${s?.port || '?'})`;
        }
        return 'SSH 连接';
      }
      if (item.type === 'FTP') {
        const info = item.ftpvo?.ftp;
        if (info) {
          const f = info.ftp || info;
          return `${info.name || f?.host || '未命名'} (${f?.user || '?'}@${f?.host || '?'}:${f?.port || '?'})`;
        }
        return 'FTP 连接';
      }
      return '未知配置';
    };
    const saveImport = () => {
      try {
        bus.emit("IMPORT_CONFIGS_TO_SAVE", { configvos: JSON.parse(importText.value || "[]") });
      } catch (error) {
        ElMessage.error(error.message);
      }
    };
    const exportConfigs = () => bus.emit("EXPORT_CONFIGS", { configvos_key: clone(selectedKeys.value) });
    const exportJSON = () => {
      const selected = {};
      for (const key of selectedKeys.value) {
        if (configvos.value[key]) {
          selected[key] = configvos.value[key];
        }
      }
      if (Object.keys(selected).length === 0) {
        ElMessage.warning("请先选择要导出的配置");
        return;
      }
      const json = JSON.stringify(selected, null, 2);
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const now = new Date();
      const ts = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}_${String(now.getHours()).padStart(2,'0')}.${String(now.getMinutes()).padStart(2,'0')}.${String(now.getSeconds()).padStart(2,'0')}`;
      a.download = `sshtools_${ts}.json`;
      a.click();
      URL.revokeObjectURL(url);
      ElMessage.success("已导出 JSON 文件");
    };
    return { configvos, configRows, selectedKeys, allKeys, isAllSelected, toggleAll, getConfigLabel, importText, saveImport, exportConfigs, exportJSON, bus };
  },
  template: `
    <main class="page">
      <header class="page-header">
        <h1 class="page-title">配置管理</h1>
      </header>
      <section class="panel">
        <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:12px;">
          <div>
            <span style="font-size:14px; font-weight:600;">选择连接</span>
            <span class="muted" style="font-size:12px; margin-left:8px;">共 {{ configRows.length }} 个连接</span>
          </div>
          <el-checkbox v-model="isAllSelected" @change="toggleAll">全选</el-checkbox>
        </div>
        <el-checkbox-group v-model="selectedKeys" v-if="configRows.length" style="display:flex; flex-direction:column; gap:8px;">
          <el-checkbox v-for="item in configRows" :key="item._id" :label="item._id" :value="item._id" style="height:auto; margin-right:0;">
            <span style="font-size:13px;">{{ getConfigLabel(item) }}</span>
          </el-checkbox>
        </el-checkbox-group>
        <p class="muted" v-else style="margin:0;">暂无连接配置</p>
        <div class="actions" style="margin-top:16px;">
          <el-button type="primary" @click="exportConfigs" :disabled="!selectedKeys.length">导出数据库 (.db)</el-button>
          <el-button @click="exportJSON" :disabled="!selectedKeys.length">导出 JSON (.json)</el-button>
        </div>
      </section>
      <section class="panel">
        <h3 style="margin:0 0 8px; font-size:14px;">导入配置</h3>
        <p class="muted" style="margin:0 0 12px; font-size:12px;">支持 .db 数据库文件，或直接粘贴 JSON 配置</p>
        <div class="actions" style="margin-top:0; margin-bottom:12px;">
          <el-button @click="bus.emit('IMPORT_FILE_CONFIGS')">从文件导入</el-button>
        </div>
        <el-input v-model="importText" type="textarea" :rows="5" placeholder='粘贴 JSON 配置' />
        <div class="actions"><el-button type="primary" @click="saveImport" :disabled="!importText.trim()">保存导入</el-button></div>
      </section>
    </main>
  `,
});

const TerminalPage = defineComponent({
  mixins: [EventPageMixin],
  setup() {
    const terminalEl = ref(null);
    const showSettings = ref(false);
    const options = reactive({
      theme: vscodeTheme(),
      cursorStyle: "bar",
      cursorWidth: 6,
      cursorBlink: true,
      fontSize: 18,
      fontFamily: "'Consolas ligaturized', Consolas, 'Microsoft YaHei', monospace",
      lineHeight: 1.1,
      scrollback: 10000,
      allowProposedApi: true,
    });
    let term;
    let fitAddon;
    let searchAddon;
    let resizeTimer;
    const applyOptions = () => {
      if (!term) return;
      Object.assign(term.options, clone(options));
      fitAddon.fit();
      bus.emit("resize", { cols: term.cols, rows: term.rows, terminalOptions: clone(options) });
    };
    onMounted(async () => {
      await nextTick();
      term = new Terminal(clone(options));
      fitAddon = new FitAddon();
      searchAddon = new SearchAddon();
      term.loadAddon(fitAddon);
      term.loadAddon(searchAddon);
      term.loadAddon(new WebLinksAddon((_, uri) => bus.emit("openLink", uri)));
      try { term.loadAddon(new WebglAddon()); } catch (_) {}
      term.open(terminalEl.value);
      fitAddon.fit();
      term.focus();
      term.onData((data) => bus.emit("data", data));
      bus.emit("initTerminal", { cols: term.cols, rows: term.rows });
      window.addEventListener("resize", applyOptions);
      resizeTimer = setInterval(applyOptions, 5000);
    });
    const disposers = [
      bus.on("terminal", () => term?.focus()),
      bus.on("connecting", (data) => {
        term?.writeln("Tip: Ctrl + mouse wheel changes font size");
        term?.writeln("Tip: Alt + mouse wheel enables fast scrolling");
        term?.write(data || "");
      }),
      bus.on("data", (data) => term?.write(data || "")),
      bus.on("path", (path) => {
        bus.emit("data", `cd ${path}\n`);
        term?.focus();
      }),
      bus.on("winpath", (path) => {
        bus.emit("data", `cd /d ${path}\n`);
        term?.focus();
      }),
      bus.on("options", (payload) => {
        Object.assign(options, clone(payload?.options));
        applyOptions();
      }),
    ];
    watch(options, applyOptions, { deep: true });
    onBeforeUnmount(() => {
      disposers.forEach((dispose) => dispose());
      window.removeEventListener("resize", applyOptions);
      clearInterval(resizeTimer);
      term?.dispose();
    });
    return { terminalEl, showSettings, options, applyOptions };
  },
  template: `
    <main class="terminal-page">
      <div ref="terminalEl" class="terminal"></div>
      <el-button class="settings-toggle" @click="showSettings = !showSettings">设置</el-button>
      <el-card v-if="showSettings" class="terminal-settings">
        <el-form :model="options" label-width="96px" size="small">
          <el-form-item label="字体大小"><el-input-number v-model="options.fontSize" :min="7" :max="80" /></el-form-item>
          <el-form-item label="行高"><el-input-number v-model="options.lineHeight" :min="1" :max="4" :step="0.1" /></el-form-item>
          <el-form-item label="回滚行数"><el-input-number v-model="options.scrollback" :min="1" :max="100000" :step="100" /></el-form-item>
          <el-form-item label="光标"><el-select v-model="options.cursorStyle"><el-option value="block" /><el-option value="underline" /><el-option value="bar" /></el-select></el-form-item>
          <el-form-item label="光标颜色"><el-color-picker v-model="options.theme.cursor" /></el-form-item>
          <el-form-item label="前景色"><el-color-picker v-model="options.theme.foreground" /></el-form-item>
          <el-form-item label="背景色"><el-color-picker v-model="options.theme.background" /></el-form-item>
          <el-button type="primary" @click="showSettings = false; applyOptions()">保存</el-button>
        </el-form>
      </el-card>
    </main>
  `,
});

const App = defineComponent({
  setup() {
    const router = useRouter();
    const dispose = bus.on("route", (name) => {
      router.replace(`/${name}`);
      bus.emit(`route-${name}`);
    });
    onMounted(() => bus.emit("init"));
    onBeforeUnmount(() => dispose());
    return {};
  },
  template: `<router-view />`,
});

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: "/", redirect: "/ssh" },
    { path: "/ftp", component: ConnectionPage, name: "ftp", props: { kind: "ftp", connectEvent: "CONNECT_FTP_INFO_CONNECT", saveEvent: "CONNECT_FTP_INFO_SAVE" } },
    { path: "/ssh", component: ConnectionPage, name: "ssh", props: { kind: "ssh", connectEvent: "CONNECT_SSH_INFO_CONNECT", saveEvent: "CONNECT_SSH_INFO_SAVE" } },
    { path: "/config", component: ConfigPage, name: "config" },
    { path: "/forward", component: ManagerPage, name: "forward", props: { kind: "forward" } },
    { path: "/remote", component: ManagerPage, name: "remote", props: { kind: "remote" } },
    { path: "/workspace", component: WorkspacePage, name: "workspace" },
    { path: "/sshXterm", component: TerminalPage, name: "sshXterm" },
  ],
});

createApp(App).use(router).use(ElementPlus).mount("#app");
