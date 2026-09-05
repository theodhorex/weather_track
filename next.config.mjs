/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverComponentsExternalPackages: ["@influxdata/influxdb-client"],
  },
};

export default nextConfig;
