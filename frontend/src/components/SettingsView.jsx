import { navigate, useCurrentPath } from "../router";
import DataLoadView from "./DataLoadView";
import DesignSystemView from "./DesignSystemView";

export function SettingsView() {
  const currentPath = useCurrentPath();
  const isDesignSystem = currentPath.startsWith("/settings/design-system");
  const activeSubTab = isDesignSystem ? "design-system" : "data";

  return (
    <div className="a-flex a-flex-col a-gap-24 a-w-full">
      {/* Sub-navigation tabs */}
      <div className="a-flex a-gap-24 a-items-center">
        <span
          className="m-tab"
          data-size="l"
          data-active={activeSubTab === "data"}
          onClick={() => navigate("/settings/data")}
        >
          Загрузка данных
        </span>
        <span
          className="m-tab"
          data-size="l"
          data-active={activeSubTab === "design-system"}
          onClick={() => navigate("/settings/design-system")}
        >
          Дизайн-система
        </span>
      </div>

      {/* Tab content */}
      <div className="a-w-full">
        {activeSubTab === "data" ? <DataLoadView /> : <DesignSystemView />}
      </div>
    </div>
  );
}

export default SettingsView;
