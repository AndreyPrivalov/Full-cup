import { Component } from "react";

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          className="m-card a-clr-text-semantic-error a-gap-12"
          data-context="overlay"
          data-size="m"
        >
          <h2 className="a-text-h2">Что-то пошло не так (ErrorBoundary)</h2>
          <details className="a-text-s" style={{ whiteSpace: "pre-wrap" }}>
            <summary className="a-cursor-pointer a-font-bold">Нажми для деталей ошибки</summary>
            {this.state.error?.toString()}
            <br />
            {this.state.errorInfo?.componentStack}
          </details>
        </div>
      );
    }

    return this.props.children;
  }
}
