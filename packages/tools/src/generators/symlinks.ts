import { promises as fs } from "node:fs";
import path from "node:path";
import { TOOLS_CONFIG } from "../config.ts";
import { getWorkspaceApps, resolvePath } from "../utils.ts";

function toWorkspaceRelativePath(targetPath: string): string {
	return path.relative(resolvePath(), targetPath).replace(/\\/g, "/");
}

async function getSymlinkTargets(): Promise<string[]> {
	const apps = await getWorkspaceApps();
	return apps.map((app) => toWorkspaceRelativePath(app.staticPath));
}

/**
 * Check if a path exists
 */
async function pathExists(targetPath: string): Promise<boolean> {
	try {
		await fs.access(targetPath);
		return true;
	} catch {
		return false;
	}
}

/**
 * Check if a path is a symbolic link
 */
async function isSymbolicLink(targetPath: string): Promise<boolean> {
	try {
		const stats = await fs.lstat(targetPath);
		return stats.isSymbolicLink();
	} catch {
		return false;
	}
}

/**
 * Create a symbolic link using Node.js built-in APIs
 */
async function createSymlink(source: string, target: string): Promise<void> {
	// Resolve paths from the project root using helper function
	const absoluteSource = resolvePath(source);
	const absoluteTarget = resolvePath(target);

	// Ensure target directory exists
	const targetDir = path.dirname(absoluteTarget);
	await fs.mkdir(targetDir, { recursive: true });

	// Remove existing target if it exists
	if (await pathExists(absoluteTarget)) {
		if (await isSymbolicLink(absoluteTarget)) {
			await fs.unlink(absoluteTarget);
			console.log(`🗑️ Removed existing symlink: ${target}`);
		} else {
			console.log(`↩️ Skipping managed static folder with existing directory: ${target}`);
			return;
		}
	}

	// Create the symbolic link
	// Use 'dir' type for directory symlinks on all platforms
	const symlinkType = "dir";

	try {
		// For Windows, use absolute paths for better compatibility
		// For Unix, use relative paths for portability
		const linkTarget = process.platform === "win32"
			? absoluteSource
			: path.relative(path.dirname(absoluteTarget), absoluteSource);

		console.log(`🔨 Creating ${symlinkType} with target: ${linkTarget}`);
		await fs.symlink(linkTarget, absoluteTarget, symlinkType);
		console.log(`✅ Created ${symlinkType}: ${target} -> ${source}`);

		// Verify the symlink was created
		const isSymlink = await isSymbolicLink(absoluteTarget);
		console.log(`🔍 Verification - Is symlink: ${isSymlink}`);
	} catch (error) {
		// Handle EEXIST gracefully - deployment environments may pre-create directories
		if (error instanceof Error && "code" in error && error.code === "EEXIST") {
			console.log(`⚠️  Target already exists, skipping symlink: ${target}`);
			return;
		}
		console.error(`❌ Failed to create symlink for ${target}:`, error);
		throw error;
	}
}

/**
 * Generate symbolic links for static folders
 */
export async function generateSymlinks(): Promise<void> {
	console.log("🔗 Setting up static asset symlinks...");

	const { source } = TOOLS_CONFIG.symlinks;
	const targets = await getSymlinkTargets();

	// Ensure source directory exists
	const absoluteSource = resolvePath(source);
	if (!(await pathExists(absoluteSource))) {
		await fs.mkdir(absoluteSource, { recursive: true });
		console.log(`📁 Created source directory: ${source}`);
	}

	// Create symlinks for each target
	for (const target of targets) {
		try {
			await createSymlink(source, target);
		} catch (error) {
			console.error(`❌ Failed to create symlink ${target}:`, error);
			// Continue with other targets even if one fails
		}
	}

	console.log("✨ Static asset symlinks created successfully!");
}

/**
 * Clean up symbolic links for static folders
 */
export async function cleanSymlinks(): Promise<void> {
	console.log("🧹 Cleaning up static asset symlinks...");

	const targets = await getSymlinkTargets();

	for (const target of targets) {
		// Resolve paths from the project root using helper function
		const absoluteTarget = resolvePath(target);

		if (await pathExists(absoluteTarget)) {
			try {
				const stats = await fs.lstat(absoluteTarget);
				if (stats.isSymbolicLink()) {
					await fs.unlink(absoluteTarget);
					console.log(`🗑️ Removed symlink: ${target}`);
				} else {
					console.log(`⚠️  Skipped non-symlink: ${target}`);
				}
			} catch (error) {
				console.error(`❌ Failed to remove ${target}:`, error);
			}
		}
	}

	console.log("✨ Symlink cleanup completed!");
}

/**
 * Check the status of symbolic links
 */
export async function checkSymlinks(): Promise<boolean> {
	console.log("🔍 Checking symlink status...");

	const { source } = TOOLS_CONFIG.symlinks;
	const targets = await getSymlinkTargets();
	let allValid = true;

	// Check if source exists
	const absoluteSource = resolvePath(source);
	const sourceExists = await pathExists(absoluteSource);
	console.log(
		`${sourceExists ? "✅" : "❌"} Source: ${source} ${
			sourceExists ? "exists" : "missing"
		}`,
	);

	if (!sourceExists) allValid = false;

	// Check each target
	for (const target of targets) {
		const absoluteTarget = resolvePath(target);
		const exists = await pathExists(absoluteTarget);
		const isSymlink = exists && (await isSymbolicLink(absoluteTarget));

		let status = "Missing";
		if (exists && isSymlink) {
			status = "Valid symlink";
		} else if (exists && !isSymlink) {
			status = "Managed manually (regular directory)";
		}

		console.log(`${isSymlink ? "✅" : "❌"} ${target}: ${status}`);
		if (!isSymlink && !exists) allValid = false;
	}

	return allValid;
}

/**
 * Watch mode - ensure symlinks exist and are valid
 */
export async function watchSymlinks(): Promise<void> {
	console.log("👀 Setting up symlinks for watch mode...");

	// Initial setup
	await generateSymlinks();

	// In watch mode, we just ensure they exist initially
	// The file system will handle the rest
	console.log("✨ Symlinks ready for development!");
}

/**
 * Run symlinks generation (main entry point)
 */
export async function run(): Promise<void> {
	await generateSymlinks();
}
