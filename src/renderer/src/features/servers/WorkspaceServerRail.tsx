import { ServerRail } from "@openbot/ui/features/servers/ServerRail";
import { Show } from "solid-js";
import { useLayout } from "../../layout";
import { useServerActions } from "./server-actions";
import { useServers } from "./servers-context";

export function WorkspaceServerRail() {
  const layout = useLayout();
  const { reorderServers } = useServers();
  const {
    orderedServers,
    select,
    switchServerLabel,
    add,
    addMenuCreateLocal,
    addMenuInstallServer,
    addCreatesServer,
    hiddenLocal,
    callbacks,
  } = useServerActions();

  return (
    <Show when={layout.serverRailVisible()}>
      <ServerRail
        servers={orderedServers()}
        onSelect={select}
        shortcutLabel={switchServerLabel}
        onReorder={(serverIds) => void reorderServers(serverIds)}
        onAdd={add}
        onCreateLocal={addMenuCreateLocal()}
        onInstallServer={addMenuInstallServer()}
        addCreatesServer={addCreatesServer()}
        hiddenLocal={hiddenLocal()}
        {...callbacks}
      />
    </Show>
  );
}
