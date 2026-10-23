import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "Content-Security-Policy",
            value: "frame-ancestors 'none'; base-uri 'self'; object-src 'none'",
          },
        ],
      },
      ...[
        "/shared/notifications/:path*",
        "/api/shared/notifications/:path*",
        "/api/notification-preferences",
        "/api/projects/:projectId/objectives/:path*",
        "/api/projects/:projectId/requirement-trace/:path*",
        "/api/projects/:projectId/requirement-agreements/:path*",
        "/api/projects/:projectId/fixed-approvals/:approvalId/next-actions",
        "/shared/publications/:path*",
        "/guest-invitations/:path*",
        "/api/guest-invitations/:path*",
        "/api/projects/:projectId/guest-invitations/:path*",
        "/api/shared/publications/:path*",
        "/api/projects/:projectId/artifact-publications/:path*",
        "/api/projects/:projectId/guest-participations/:path*",
      ].map((source) => ({
        source,
        headers: [{ key: "Referrer-Policy", value: "no-referrer" }],
      })),
    ];
  },
};

export default nextConfig;
