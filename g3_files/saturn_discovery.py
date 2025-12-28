"""
Saturn mDNS Service Discovery Module

Provides one-time discovery of Saturn OpenRouter proxy servers using DNS-SD.
Adapted from saturn_files/simple_chat_client.py for use in LLM agents.

Usage:
    from g3_files.saturn_discovery import get_saturn_server

    # Get best server (lowest priority value = highest preference)
    url = get_saturn_server()

    # Get specific server by name
    url = get_saturn_server(preferred_name="OpenRouter")

    # Get all servers
    servers = get_all_saturn_servers()

    # Enable verbose logging for debugging
    url = get_saturn_server(verbose=True)

Priority Handling:
    - Lower priority values have HIGHER preference (e.g., 10 is better than 50)
    - Multiple servers on different ports are kept separate
    - Servers with same URL are deduplicated (prefers non-loopback IPs)
    - Default priority is 50 if not specified in mDNS advertisement
"""

import subprocess
import socket
import time
import re
from typing import Optional, List
from dataclasses import dataclass
from datetime import datetime


@dataclass
class SaturnService:
    """Represents a discovered Saturn service"""
    name: str
    url: str
    priority: int
    ip: str
    last_seen: datetime


def get_saturn_server(preferred_name: Optional[str] = None, verbose: bool = False) -> Optional[str]:
    """
    Get Saturn server URL for use in agents.

    Args:
        preferred_name: Optional service name to prefer (e.g., "OpenRouter")
        verbose: If True, print discovery details to console

    Returns:
        Server URL (e.g., "http://192.168.1.100:8080") or None if no servers found
    """
    servers = get_all_saturn_servers()

    if not servers:
        return None

    if verbose and len(servers) > 1:
        print(f"[Saturn Discovery] Found {len(servers)} servers:")
        for srv in servers:
            print(f"  - {srv.name}: {srv.url} (priority={srv.priority})")

    # If preferred name specified, find that server
    if preferred_name:
        for server in servers:
            if server.name == preferred_name:
                if verbose:
                    print(f"[Saturn Discovery] Using preferred server: {server.name}")
                return server.url
        # Preferred server not found, fall through to default behavior
        if verbose:
            print(f"[Saturn Discovery] Preferred server '{preferred_name}' not found, using best priority")

    # Return server with lowest priority (highest preference)
    best_server = min(servers, key=lambda s: s.priority)
    if verbose and len(servers) > 1:
        print(f"[Saturn Discovery] Selected: {best_server.name} (priority={best_server.priority})")
    return best_server.url


def get_all_saturn_servers() -> List[SaturnService]:
    """
    Discover all Saturn servers on the local network.

    Returns:
        List of SaturnService objects sorted by priority (lowest first)
    """
    services = _run_dns_sd_discovery()

    if not services:
        return []

    # Convert to SaturnService objects
    current_time = datetime.now()
    saturn_services = [
        SaturnService(
            name=svc['name'],
            url=svc['url'],
            priority=svc['priority'],
            ip=svc['ip'],
            last_seen=current_time
        )
        for svc in services
    ]

    # Sort by priority (lowest first)
    return sorted(saturn_services, key=lambda s: s.priority)


def _run_dns_sd_discovery() -> List[dict]:
    """
    Run dns-sd discovery and return list of service dictionaries.

    Returns:
        List of dicts with keys: name, url, priority, ip
    """
    services = []

    try:
        # Browse for services (2 second timeout)
        browse_proc = subprocess.Popen(
            ['dns-sd', '-B', '_saturn._tcp', 'local'],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )

        time.sleep(2.0)
        browse_proc.terminate()

        try:
            stdout, stderr = browse_proc.communicate(timeout=2)
        except subprocess.TimeoutExpired:
            browse_proc.kill()
            stdout, stderr = browse_proc.communicate()

        # Parse service names from browse output
        service_names = []
        for line in stdout.split('\n'):
            if 'Add' in line and '_saturn._tcp' in line:
                parts = line.split()
                if len(parts) > 6:
                    service_names.append(parts[6])

        # Get details for each service
        for service_name in service_names:
            try:
                lookup_proc = subprocess.Popen(
                    ['dns-sd', '-L', service_name, '_saturn._tcp', 'local'],
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE,
                    text=True
                )

                time.sleep(1.5)
                lookup_proc.terminate()

                try:
                    stdout, stderr = lookup_proc.communicate(timeout=2)
                except subprocess.TimeoutExpired:
                    lookup_proc.kill()
                    stdout, stderr = lookup_proc.communicate()

                hostname = None
                port = None
                priority = 50  # Default priority

                # Parse lookup output
                for line in stdout.split('\n'):
                    if 'can be reached at' in line:
                        match = re.search(r'can be reached at (.+):(\d+)', line)
                        if match:
                            hostname = match.group(1).rstrip('.')
                            port = int(match.group(2))

                    if 'priority=' in line:
                        parts = line.split('priority=')
                        if len(parts) > 1:
                            priority_str = parts[1].split()[0]
                            priority = int(priority_str)

                if hostname and port:
                    try:
                        ip_address = socket.gethostbyname(hostname)
                    except socket.gaierror:
                        ip_address = hostname

                    service_url = f"http://{ip_address}:{port}"
                    services.append({
                        'name': service_name,
                        'url': service_url,
                        'priority': priority,
                        'ip': ip_address
                    })

            except (subprocess.TimeoutExpired, ValueError, IndexError):
                continue

    except FileNotFoundError:
        # dns-sd not available (Bonjour not installed)
        return []
    except Exception:
        return []

    # Deduplicate by URL (same host:port), preferring non-loopback IPs and lower priority
    # This allows multiple Saturn servers on different ports while removing duplicates
    # from multiple network interfaces
    unique_services = {}
    for svc in services:
        # Use URL as key to distinguish servers on different ports
        # Extract port from URL for consistent keying
        url_key = svc['url']  # e.g., "http://192.168.1.100:8080"
        ip = svc['ip']
        is_loopback = ip.startswith('127.') or ip == 'localhost'

        if url_key not in unique_services:
            unique_services[url_key] = svc
        else:
            existing = unique_services[url_key]
            existing_is_loopback = existing['ip'].startswith('127.') or existing['ip'] == 'localhost'

            # Replace if: better priority, OR same priority but prefer non-loopback
            # Note: Lower priority value = higher preference
            if (svc['priority'] < existing['priority']) or \
               (svc['priority'] == existing['priority'] and existing_is_loopback and not is_loopback):
                unique_services[url_key] = svc

    return list(unique_services.values())


if __name__ == "__main__":
    """Test the discovery module"""
    print("=" * 60)
    print("Saturn mDNS Discovery Test")
    print("=" * 60)
    print("\nSearching for Saturn servers...")
    servers = get_all_saturn_servers()

    if not servers:
        print("\n[FAIL] No Saturn servers found.")
        print("\nMake sure:")
        print("  1. A Saturn server is running (python saturn_files/openrouter_server.py)")
        print("  2. dns-sd is available (install Bonjour on Windows)")
        print("  3. You're on the same network as the server")
    else:
        print(f"\n[SUCCESS] Found {len(servers)} Saturn server(s):")
        print()
        for svc in servers:
            print(f"  Name:     {svc.name}")
            print(f"  URL:      {svc.url}")
            print(f"  Priority: {svc.priority} (lower = higher preference)")
            print(f"  IP:       {svc.ip}")
            print()

        print("-" * 60)
        print("Priority Selection Test:")
        print("-" * 60)
        best_url = get_saturn_server(verbose=True)
        print(f"\n[SELECTED] Best server URL: {best_url}")
        print()

        if len(servers) > 1:
            print("Note: Lower priority values have HIGHER preference.")
            print("      The server with the lowest priority number was selected.")
