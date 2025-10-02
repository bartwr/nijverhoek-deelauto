import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	images: {
		remotePatterns: [
			{
				protocol: 'https',
				hostname: 'i.giphy.com',
				port: '',
				pathname: '/**',
			},
		],
	},
	// Ensure CSS is properly optimized and cached
	experimental: {
		optimizeCss: true,
	},
	// Add proper headers for CSS caching
	async headers() {
		return [
			{
				source: '/_next/static/css/(.*)',
				headers: [
					{
						key: 'Cache-Control',
						value: 'public, max-age=31536000, immutable',
					},
				],
			},
		];
	},
};

export default nextConfig;
