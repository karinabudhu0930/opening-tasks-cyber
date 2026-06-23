/** @type {import('next').NextConfig} */
const openingTasksBasePath = "/opening-tasks";

const nextConfig = {
  basePath: openingTasksBasePath,
  async redirects() {
    return [
      {
        source: "/",
        destination: openingTasksBasePath,
        permanent: false,
        basePath: false
      }
    ];
  }
};

export default nextConfig;
