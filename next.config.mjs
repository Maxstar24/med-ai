/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // Warning during builds, don't fail deployment
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Handled by editor/IDE, don't fail deployment
    ignoreBuildErrors: true,
  }
};

export default nextConfig; 