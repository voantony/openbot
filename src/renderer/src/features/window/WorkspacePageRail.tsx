import { isUpdateActivePhase } from "@openbot/contracts/ipc";
import { AGENT_TASKS_CAPABILITY } from "@openbot/contracts/team-protocol/agent-tasks-v1";
import { CRM_CAPABILITY } from "@openbot/contracts/team-protocol/crm-v1";
import { ContextMenu } from "@openbot/ui";
import { ServerMenu } from "@openbot/ui/features/servers/ServerMenu";
import {
  addServerLabel,
  ServerRail,
  ServerRailAddItems,
  ServerRailButton,
} from "@openbot/ui/features/servers/ServerRail";
import { PageRail, type PageRailPage } from "@openbot/ui/features/window/PageRail";
import { useText } from "@openbot/ui/text";
import { createEffect, createSignal, For, onSettled, Show } from "solid-js";
import { playActionSound } from "../../action-sounds";
import { appPort } from "../../app-port";
import { useLayout } from "../../layout";
import { WorkflowsPage } from "../../lazy-views";
import { usePlatform } from "../../platform";
import { useCustomAgents } from "../custom-agents/custom-agents-context";
import { serverHasStorage } from "../files/storage-usage";
import { useServerActions } from "../servers/server-actions";
import {
  activeServerHasProviderSettings,
  serverCanAdminister,
  serverSupportsCapability,
} from "../servers/server-capabilities";
import { isFavoriteServer } from "../servers/server-favorites";
import { useServerSettings } from "../servers/server-settings";
import { useServers } from "../servers/servers-context";
import { useSettings } from "../settings/settings-context";
import { useUpdates } from "../updates/updates-context";
import { useWhatsNew } from "../updates/whats-new-context";
import { usePlanLimitRows } from "../usage/plan-limit-rows";
import { useUsage } from "../usage/usage-context";
import { createWorkflowMediaCredits } from "../workflows/workflow-media-credits";
import { desktopMediaCredits } from "../workflows/workflows-port";
import { RailHelpMenu } from "./RailHelpMenu";
import { useWindowPage } from "./window-page-context";

export function WorkspacePageRail(props: { hidden: boolean }) {
  const text = useText();
  const windowPage = useWindowPage();
  const { openAppSettings, setSkillsMarketplaceOpen, setPendingPluginSlug, setPendingPluginConnect } = useSettings();
  const usage = useUsage();
  const updates = useUpdates();
  const layout = useLayout();
  const whatsNew = useWhatsNew();
  const { activeServer, reorderServers } = useServers();
  const platform = usePlatform();
  const serverActions = useServerActions();
  const [serverFlyoutOpen, setServerFlyoutOpen] = createSignal(false);
  let addMenuAnchor: HTMLElement | undefined;
  function openAddMenu(clientX: number, clientY: number): void {
    addMenuAnchor?.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true, clientX, clientY }));
  }
  function openAddMenuFromRail(event: MouseEvent): void {
    if (event.target instanceof Element && event.target.closest(".server-rail-button")) return;
    event.preventDefault();
    event.stopPropagation();
    openAddMenu(event.clientX, event.clientY);
  }
  const firstColumnServers = () => {
    const ordered = serverActions.orderedServers();
    const favorites = ordered.filter((server) => isFavoriteServer(server.id));
    return favorites.length > 0 ? favorites : ordered;
  };
  const pageRailAddLabel = () =>
    addServerLabel({
      addCreatesServer: serverActions.addCreatesServer(),
      onCreateLocal: serverActions.addMenuCreateLocal(),
    });
  createEffect(
    () => serverFlyoutOpen(),
    (open) => {
      if (!open) return;
      const closeOnEscape = (event: KeyboardEvent) => {
        if (event.key === "Escape") setServerFlyoutOpen(false);
      };
      window.addEventListener("keydown", closeOnEscape);
      return () => window.removeEventListener("keydown", closeOnEscape);
    },
  );
  const { openServerSettings, serverSettingsTarget, serverSettingsShownSection } = useServerSettings();
  const logo = () => {
    const info = platform.appInfo();
    return info && info.platform !== "darwin" ? { variant: info.variant } : undefined;
  };
  const usageRows = usePlanLimitRows();
  const mediaCredits = createWorkflowMediaCredits(
    () => (windowPage.page() === "workflows" ? usage.state.serverId : null),
    desktopMediaCredits,
  );
  const { customAgentUsage } = useCustomAgents();
  const localAgentUsage = () => (activeServer()?.kind === "local" ? customAgentUsage() : []);
  const updateNotice = () => {
    const phase = updates.status().phase;
    if (!layout.leftPanelCompact() || !isUpdateActivePhase(phase)) return undefined;
    return text.t(phase === "ready" || phase === "installing" ? "account.update.ready" : "account.update.available");
  };
  const tasksAvailable = () => {
    const server = activeServer();
    return !server || server.kind === "local" || serverSupportsCapability(server, AGENT_TASKS_CAPABILITY);
  };
  const openProviders = () => {
    const server = activeServer();
    if (!server || !activeServerHasProviderSettings(server)) return undefined;
    return (button: HTMLElement) => openServerSettings(server.id, button, "providers");
  };
  const crmShown = () => serverCanAdminister(activeServer(), CRM_CAPABILITY) && usage.crmEnabled() === true;
  function crmRailAction(): ((button: HTMLElement) => void) | undefined {
    return crmShown() ? windowPage.openCrm : undefined;
  }
  function crmConnectorsAction(): ((button: HTMLElement) => void) | undefined {
    if (!crmShown()) return undefined;
    return (button) => windowPage.openCrm(button, true);
  }
  const current = (): PageRailPage | null => {
    const page = windowPage.page();
    if (page === "agents") return "agents";
    if (page === "server-settings") {
      const providers =
        serverSettingsShownSection() === "providers" && serverSettingsTarget()?.id === activeServer()?.id;
      return providers ? "providers" : null;
    }
    return page === "pricing" ? null : page;
  };
  function moveServer(serverId: string, direction: -1 | 1): void {
    const ids = serverActions
      .orderedServers()
      .filter((server) => server.kind === "remote")
      .map((server) => server.id);
    const index = ids.indexOf(serverId);
    const targetIndex = index + direction;
    const moved = ids[index];
    const displaced = ids[targetIndex];
    if (index < 0 || moved === undefined || displaced === undefined) return;
    ids[index] = displaced;
    ids[targetIndex] = moved;
    void reorderServers(ids);
  }
  onSettled(() => {
    const handleServerShortcut = (event: KeyboardEvent) => {
      const isMac = platform.appInfo()?.platform === "darwin";
      if (
        platform.landingPreview ||
        !platform.appInfo() ||
        event.defaultPrevented ||
        event.isComposing ||
        event.repeat ||
        event.altKey ||
        event.shiftKey ||
        (isMac ? !event.metaKey || event.ctrlKey : !event.ctrlKey || event.metaKey) ||
        !/^[1-9]$/.test(event.key)
      ) {
        return;
      }
      const server = serverActions.orderedServers()[Number(event.key) - 1];
      if (!server) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      if (server.active) return;
      playActionSound("navigate");
      serverActions.select(server.id);
    };
    window.addEventListener("keydown", handleServerShortcut);
    return () => window.removeEventListener("keydown", handleServerShortcut);
  });
  return (
    <PageRail
      hidden={props.hidden}
      current={current()}
      pinned={layout.railPinned()}
      onPinChange={layout.setRailPinned}
      usageRows={usageRows()}
      customAgentUsage={localAgentUsage()}
      mediaCredits={mediaCredits()}
      onMediaCredits={(provider) => {
        windowPage.leavePricing();
        setPendingPluginConnect(false);
        setPendingPluginSlug(provider);
        setSkillsMarketplaceOpen(true);
      }}
      onAgents={() => windowPage.showAgents()}
      onWorkflows={() => windowPage.openWorkflows(null)}
      onPreloadWorkflows={() => void WorkflowsPage.preload()}
      onSchedule={windowPage.openSchedule}
      onTasks={tasksAvailable() ? windowPage.openTasks : undefined}
      onUsage={windowPage.openUsage}
      onLibrary={serverHasStorage(activeServer()) ? windowPage.openLibrary : undefined}
      onProviders={openProviders()}
      onCrm={crmRailAction()}
      onCrmConnectors={crmConnectorsAction()}
      onMarketplace={() => {
        windowPage.leavePricing();
        setSkillsMarketplaceOpen(true);
      }}
      onSettings={(button) => (updateNotice() ? openAppSettings(button, "updates") : windowPage.openSettings(button))}
      settingsNotice={updateNotice()}
      logo={logo()}
      server={
        <Show when={platform.appInfo() && !layout.serverPageRailVisible()}>
          <ServerMenu
            rail
            serverName={activeServer()?.name ?? text.t("sidebar.topbar.localServer")}
            servers={serverActions.orderedServers()}
            view={layout.serverView()}
            onViewChange={layout.setServerView}
            onSelect={serverActions.select}
            onAdd={serverActions.add}
            onCreateLocal={serverActions.addMenuCreateLocal()}
            onInstallServer={serverActions.addMenuInstallServer()}
            addCreatesServer={serverActions.addCreatesServer()}
            hiddenLocal={serverActions.hiddenLocal()}
            {...serverActions.callbacks}
          />
        </Show>
      }
      serverList={
        <>
          <nav
            class="window-rail-server-list-host"
            aria-label={text.t("server.rail.label")}
            onContextMenu={openAddMenuFromRail}
            onPointerEnter={() => setServerFlyoutOpen(true)}
            onPointerLeave={() => setServerFlyoutOpen(false)}
            onFocusIn={() => setServerFlyoutOpen(true)}
            onFocusOut={(event) => {
              if (event.relatedTarget instanceof Node && event.currentTarget.contains(event.relatedTarget)) return;
              setServerFlyoutOpen(false);
            }}
          >
            <Show when={layout.serverPageRailVisible()}>
              <For each={firstColumnServers()} keyed={(server) => server.id}>
                {(server) => (
                  <ServerRailButton
                    {...serverActions.callbacks}
                    server={server()}
                    deleteAt={serverActions.callbacks.planDeletesAt?.(server().id) ?? null}
                    onSelect={serverActions.select}
                    shortcutLabel={serverActions.switchServerLabel(server().id)}
                    onMove={server().kind === "remote" ? (direction) => moveServer(server().id, direction) : undefined}
                  />
                )}
              </For>
            </Show>
            <Show when={serverFlyoutOpen() && layout.serverPageRailVisible()}>
              <div class="window-rail-server-flyout">
                <ServerRail
                  servers={serverActions.orderedServers()}
                  onSelect={(serverId) => {
                    setServerFlyoutOpen(false);
                    serverActions.select(serverId);
                  }}
                  shortcutLabel={serverActions.switchServerLabel}
                  onReorder={(serverIds) => void reorderServers(serverIds)}
                  onAdd={() => {
                    setServerFlyoutOpen(false);
                    serverActions.add();
                  }}
                  onCreateLocal={serverActions.addMenuCreateLocal()}
                  onInstallServer={serverActions.addMenuInstallServer()}
                  addCreatesServer={serverActions.addCreatesServer()}
                  hiddenLocal={serverActions.hiddenLocal()}
                  {...serverActions.callbacks}
                />
              </div>
            </Show>
          </nav>
          <ContextMenu.Root modal={false}>
            <ContextMenu.Trigger hidden ref={(element) => (addMenuAnchor = element)} />
            <ContextMenu.Portal>
              <ContextMenu.Content class="agent-context-menu" aria-label={text.t(pageRailAddLabel())}>
                <ServerRailAddItems
                  menu={ContextMenu}
                  addLabel={pageRailAddLabel()}
                  onAdd={serverActions.add}
                  onCreateLocal={serverActions.addMenuCreateLocal()}
                  onInstallServer={serverActions.addMenuInstallServer()}
                  hiddenLocal={serverActions.hiddenLocal()}
                />
              </ContextMenu.Content>
            </ContextMenu.Portal>
          </ContextMenu.Root>
        </>
      }
      help={
        <RailHelpMenu
          version={whatsNew.state.version}
          onOpenWhatsNew={whatsNew.reopen}
          onOpenLink={(destination) => void appPort().openExternal(destination)}
        />
      }
    />
  );
}
