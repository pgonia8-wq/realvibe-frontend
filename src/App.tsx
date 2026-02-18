// src/App.tsx
import { Switch, Route } from "wouter";
import HomePage from "./pages/HomePage";
import AuthPage from "./pages/AuthPage";

function App() {
  return (
    <Switch>
      <Route path="/auth" component={AuthPage} />
      <Route path="/" component={HomePage} />
    </Switch>
  );
}

export default App;
