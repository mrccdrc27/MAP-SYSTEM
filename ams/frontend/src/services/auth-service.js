// Authentication service URLs - uses environment variable for API Gateway support
const AUTH_BASE_URL = import.meta.env.VITE_AUTH_API_URL || "http://127.0.0.1:8001/";
const API_URL_AUTH = `${AUTH_BASE_URL}auth/`;
const API_URL_USER = `${AUTH_BASE_URL}users/`;

class AuthService {
  // Login user and store tokens
  async login(email, password) {
    try {
      const response = await fetch(API_URL_AUTH + "jwt/create/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        console.log("login failed!");
        return false;
      }

      const data = await response.json();
      // console.log("data:", data);

      if (data.access) {
        sessionStorage.setItem("access", data.access);
        sessionStorage.setItem("refresh", data.refresh);
        // console.log("Token successfully stored in the local storage!");

        // Store the user info in session storage
        const currentUser = await this.getCurrrentUser();
        sessionStorage.setItem("user", JSON.stringify(currentUser));
        // console.log("User info stored in session storage!");

        return currentUser;
      } else {
        console.log("No access token in response!");
      }

      return false;
    } catch (error) {
      console.error("Login failed", error);
      throw error;
    }
  }

  // Determine if there is any active admin
  async hasActiveAdmin() {
    try {
      const response = await fetch(API_URL_USER + "has_active_admin/");

      if (!response.ok) {
        console.log("failed to determine if there is any active admin");
        return false;
      }

      const data = await response.json();

      // console.log("Fetched data:", data);
      return data;
    } catch (error) {
      console.log("Failed to determine if there is any active admin");
    }
  }

  // Get current user
  async getCurrrentUser() {
    try {
      const response = await fetch(API_URL_AUTH + "users/me/", {
        method: "GET",
        headers: this.getAuthHeader(),
      });

      if (!response.ok) {
        console.log("failed to fetch curr. user");
      }

      const data = await response.json();

      // console.log("here's the fetched: ", data);
      return data;
    } catch (error) {
      console.log("Failed to get the current user!", error);
    }
  }

  // Get all users
  async getAllUsers() {
    try {
      const response = await fetch(API_URL_USER + "get_all_users/", {
        method: "GET",
      });

      if (!response.ok) {
        console.log("failed to fetch all users");
        return [];
      }

      const data = await response.json();

      // console.log("here's the fetched: ", data);
      return data;
    } catch (error) {
      console.log("Failed to get all users!", error);
      return [];
    }
  }

  // Get the access token
  getAccessToken() {
    return sessionStorage.getItem("access");
  }

  // Get the Autorization headers
  getAuthHeader() {
    const token = this.getAccessToken();
    return {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: token ? `JWT ${token}` : "",
    };
  }

  getUserInfo() {
    const user = sessionStorage.getItem("user");
    try {
      return user ? JSON.parse(user) : null;
    } catch {
      return null;
    }
  }

  // Logout and clear the tokens
  logout() {
    sessionStorage.removeItem("access");
    sessionStorage.removeItem("refresh");
    // localStorage.removeItem("user");
    sessionStorage.removeItem("user");
  }
}

const authService = new AuthService();

export default authService;
