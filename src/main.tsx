import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Global Fetch Interceptor to handle Multi-User Isolation token headers automatically
const originalFetch = window.fetch;
const interceptedFetch = async function (input: RequestInfo | URL, init?: RequestInit) {
  let url = "";
  if (typeof input === "string") {
    url = input;
  } else if (input && (input as any).url) {
    url = (input as any).url;
  }

  if (url.startsWith("/api/")) {
    const token = localStorage.getItem("token");
    if (token) {
      init = init || {};
      init.headers = init.headers || {};
      if (init.headers instanceof Headers) {
        init.headers.set("Authorization", `Bearer ${token}`);
      } else if (Array.isArray(init.headers)) {
        const authIndex = init.headers.findIndex(([k]) => k.toLowerCase() === "authorization");
        if (authIndex !== -1) {
          init.headers[authIndex] = ["Authorization", `Bearer ${token}`];
        } else {
          init.headers.push(["Authorization", `Bearer ${token}`]);
        }
      } else {
        (init.headers as any)["Authorization"] = `Bearer ${token}`;
      }
    }
  }

  try {
    const response = await originalFetch(input, init);
    
    if (response.status === 401 && url.startsWith("/api/") && !url.includes("/api/auth/login") && !url.includes("/api/auth/register")) {
      localStorage.removeItem("user_id");
      localStorage.removeItem("name");
      localStorage.removeItem("email");
      localStorage.removeItem("isGuest");
      localStorage.removeItem("token");
      localStorage.removeItem("guest_session");
      window.dispatchEvent(new CustomEvent("timehero-logout"));
    }
    
    return response;
  } catch (err) {
    throw err;
  }
};

try {
  Object.defineProperty(window, 'fetch', {
    value: interceptedFetch,
    writable: true,
    configurable: true,
    enumerable: true
  });
} catch (e) {
  console.error("Failed to intercept fetch via defineProperty, falling back to direct assignment", e);
  try {
    (window as any).fetch = interceptedFetch;
  } catch (err) {
    console.error("Fetch interceptor registration failed entirely", err);
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
