import styles from "../App.module.css";
import { useSavings } from "../hooks/useSavings";

export function HeaderBalance() {
  const { data: savingsData = [], isLoading } = useSavings();

  if (isLoading) {
    return <div className={styles.balance}>Загрузка...</div>;
  }

  const sortedSavings = [...savingsData].sort((a, b) => new Date(a.date) - new Date(b.date));
  const latestSaving = sortedSavings[sortedSavings.length - 1];
  const prevSaving = sortedSavings[sortedSavings.length - 2];

  if (!latestSaving) return null;

  const balanceValue = latestSaving.cash + latestSaving.electronic;
  const prevBalanceValue = prevSaving ? prevSaving.cash + prevSaving.electronic : 0;
  const diffValue = balanceValue - prevBalanceValue;

  const formattedBalance = `${balanceValue.toLocaleString("ru-RU")} ₽`;
  const formattedDiff = (diffValue >= 0 ? "+" : "") + diffValue.toLocaleString("ru-RU");
  const diffColor =
    diffValue >= 0 ? "var(--clr-text-semantic-success)" : "var(--clr-text-semantic-error)";

  return (
    <div className={styles.balance}>
      {formattedBalance}{" "}
      <span className={styles.balanceDiff} style={{ color: diffColor }}>
        {formattedDiff}
      </span>
    </div>
  );
}
