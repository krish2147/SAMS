import { Request, Response, NextFunction } from "express";
import { UserService } from "../services/user.service";

function parseCookies(cookieStr: string) {
  const list: { [key: string]: string } = {};
  if (!cookieStr) return list;
  cookieStr.split(";").forEach((cookie) => {
    const parts = cookie.split("=");
    list[parts.shift()!.trim()] = decodeURI(parts.join("="));
  });
  return list;
}

export function requireAuth(allowedRoles: string[]) {
  return async (req: any, res: Response, next: NextFunction) => {
    try {
    let token = req.headers["x-session-token"] || req.headers["authorization"]?.replace("Bearer ", "");
    if (!token && req.headers.cookie) {
      const cookies = parseCookies(req.headers.cookie);
      token = cookies["sams_session_token"];
    }

    if (!token) {
      return res.status(401).json({ error: "Session expired or invalid. Please login again." });
    }

    const session = await UserService.getSession(token as string);
    if (!session) {
      return res.status(401).json({ error: "Session expired or invalid. Please login again." });
    }

    // Normalize roles (e.g. support receptionist as staff)
    let userRole = session.role;
    if (userRole === "receptionist") userRole = "staff";

    // Normalize allowedRoles
    const normalizedAllowed = allowedRoles.map(r => r === "receptionist" ? "staff" : r);

    if (!normalizedAllowed.includes(userRole)) {
      return res.status(403).json({ error: "Access denied. Insufficient permissions." });
    }

    req.user = session;
    next();
    } catch (err) {
      next(err);
    }
  };
}
