/** @type {import('next').NextConfig} */
const nextConfig = {
  // Imweb iframe에 임베드할 수 있도록 프레임 차단 헤더를 열어둡니다.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "ALLOWALL" },
        ],
      },
    ];
  },
};

export default nextConfig;
