import { getPrevMonthToDateString } from "../utils";
import { Dropdown } from "./Dropdown";

export function PeriodDropdown({ controlPeriod, setControlPeriod }) {
  const periods = [
    "прошлым месяцем",
    getPrevMonthToDateString(),
    "средним за 3 мес",
    "средним за 6 мес",
    "средним за год",
  ];

  const options = periods.map((p) => ({ value: p, label: p }));

  return (
    <div className="a-flex a-items-center a-gap-4">
      <span className="a-clr-text-primary" style={{ whiteSpace: "nowrap" }}>
        Сравнивать с
      </span>
      <div>
        <Dropdown
          value={controlPeriod}
          onChange={(e) => setControlPeriod?.(e.target.value)}
          options={options}
          size="s"
        />
      </div>
    </div>
  );
}
