import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import Login from "../src/pages/Login";
import { API_URL } from "../src/api";

describe("Login page", () => {
  it("links Sign in with Google to the backend's OAuth start endpoint", () => {
    window.history.pushState({}, "", "/login");
    render(<Login />);

    const link = screen.getByRole("link", { name: /sign in with google/i });
    expect(link).toHaveAttribute("href", `${API_URL}/api/auth/google`);
  });

  it("shows an error message when redirected back with ?error=1", () => {
    window.history.pushState({}, "", "/login?error=1");
    render(<Login />);

    expect(screen.getByText(/login failed/i)).toBeInTheDocument();
  });

  it("shows no error message on a plain visit", () => {
    window.history.pushState({}, "", "/login");
    render(<Login />);

    expect(screen.queryByText(/login failed/i)).not.toBeInTheDocument();
  });
});
