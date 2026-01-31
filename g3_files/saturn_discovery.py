"""
Saturn mDNS Service Discovery Module

Uses Saturn v2.0 library for cross-platform mDNS discovery.
Falls back to subprocess-based dns-sd discovery if Saturn package not installed.

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
from dataclasses import dataclass, field
from datetime import datetime

try:
    from saturn import discover_services
    SATURN_AVAILABLE = True
except ImportError:
    SATURN_AVAILABLE = False


@dataclass
class SaturnService:
    """Represents a discovered Saturn service (backward compatible)"""
    name: str
    url: str
    priority: int
    ip: str
    last_seen: datetime
    ephemeral_key: Optional[str] = None
    capabilities: List[str] = field(default_factory=list)
    models: List[str] = field(default_factory=list)


def get_saturn_server(preferred_name: Optional[str] = None, verbose: bool = False) -> Optional[str]:
    """
    Get Saturn server URL for use in agents.

    Args:
        preferred_name: Optional service name to prefer (e.g., "OpenRouter")
        verbose: If True, print discovery details to console

    Returns:
        Server URL (e.g., "http://192.168.1.100:8080") or None if no servers found
    """
    if SATURN_AVAILABLE:
        result = _saturn_v2_get_server(preferred_name, verbose)
        if result is not None:
            return result
        if verbose:
            print("[Saturn] v2.0 discovery returned no servers, trying legacy...")

    return _legacy_get_saturn_server(preferred_name, verbose)


def get_all_saturn_servers() -> List[SaturnService]:
    """
    Discover all Saturn servers on the local network.

    Returns:
        List of SaturnService objects sorted by priority (lowest first)
    """
    if SATURN_AVAILABLE:
        try:
            servers = _saturn_v2_get_all_servers()
            if servers:
                return servers
        except Exception:
            pass

    return _legacy_get_all_saturn_servers()


def _saturn_v2_get_server(preferred_name: Optional[str], verbose: bool) -> Optional[str]:
    """Use Saturn v2.0 library for discovery."""
    try:
        services = discover_services(timeout=5.0, settle_time=0.5)

        if not services:
            return None

        if verbose and len(services) > 1:
            print(f"[Saturn v2.0] Found {len(services)} servers:")
            for svc in services:
                print(f"  - {svc.name}: http://{svc.host}:{svc.port} (priority={svc.priority})")

        if preferred_name:
            for svc in services:
                if svc.name == preferred_name:
                    if verbose:
                        print(f"[Saturn v2.0] Using preferred server: {svc.name}")
                    return f"http://{svc.host}:{svc.port}"
            if verbose:
                print(f"[Saturn v2.0] Preferred server '{preferred_name}' not found, using best priority")

        best = services[0]
        if verbose and len(services) > 1:
            print(f"[Saturn v2.0] Selected: {best.name} (priority={best.priority})")

        return f"http://{best.host}:{best.port}"

    except Exception as e:
        if verbose:
            print(f"[Saturn v2.0] Discovery error: {e}")
        return None


def _saturn_v2_get_all_servers() -> List[SaturnService]:
    """Use Saturn v2.0 library to get all servers."""
    services = discover_services(timeout=5.0, settle_time=0.5)
    current_time = datetime.now()

    return [
        SaturnService(
            name=svc.name,
            url=f"http://{svc.host}:{svc.port}",
            priority=svc.priority,
            ip=svc.host,
            last_seen=current_time,
            ephemeral_key=getattr(svc, 'ephemeral_key', None),
            capabilities=list(getattr(svc, 'capabilities', [])) if hasattr(svc, 'capabilities') else [],
            models=list(getattr(svc, 'models', [])) if hasattr(svc, 'models') else [],
        )
        for svc in services
    ]


def _legacy_get_saturn_server(preferred_name: Optional[str], verbose: bool) -> Optional[str]:
    """Original subprocess-based discovery (fallback)."""
    servers = _legacy_get_all_saturn_servers()

    if not servers:
        return None

    if verbose and len(servers) > 1:
        print(f"[Saturn Legacy] Found {len(servers)} servers:")
        for srv in servers:
            print(f"  - {srv.name}: {srv.url} (priority={srv.priority})")

    if preferred_name:
        for server in servers:
            if server.name == preferred_name:
                if verbose:
                    print(f"[Saturn Legacy] Using preferred server: {server.name}")
                return server.url
        if verbose:
            print(f"[Saturn Legacy] Preferred server '{preferred_name}' not found, using best priority")

    best_server = min(servers, key=lambda s: s.priority)
    if verbose and len(servers) > 1:
        print(f"[Saturn Legacy] Selected: {best_server.name} (priority={best_server.priority})")
    return best_server.url


def _legacy_get_all_saturn_servers() -> List[SaturnService]:
    """Original subprocess-based discovery (fallback)."""
    services = _run_dns_sd_discovery()

    if not services:
        return []

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

    return sorted(saturn_services, key=lambda s: s.priority)


def _run_dns_sd_discovery() -> List[dict]:
    """
    Run dns-sd discovery and return list of service dictionaries.

    Returns:
        List of dicts with keys: name, url, priority, ip
    """
    services = []

    try:
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

        service_names = []
        for line in stdout.split('\n'):
            if 'Add' in line and '_saturn._tcp' in line:
                parts = line.split()
                if len(parts) > 6:
                    service_names.append(parts[6])

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
                priority = 50

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
        return []
    except Exception:
        return []

    unique_services = {}
    for svc in services:
        url_key = svc['url']
        ip = svc['ip']
        is_loopback = ip.startswith('127.') or ip == 'localhost'

        if url_key not in unique_services:
            unique_services[url_key] = svc
        else:
            existing = unique_services[url_key]
            existing_is_loopback = existing['ip'].startswith('127.') or existing['ip'] == 'localhost'

            if (svc['priority'] < existing['priority']) or \
               (svc['priority'] == existing['priority'] and existing_is_loopback and not is_loopback):
                unique_services[url_key] = svc

    return list(unique_services.values())


if __name__ == "__main__":
    print("=" * 60)
    print("Saturn mDNS Discovery Test")
    print("=" * 60)

    if SATURN_AVAILABLE:
        print("\n[INFO] Saturn v2.0 package is installed")
    else:
        print("\n[INFO] Saturn v2.0 package NOT installed, using legacy dns-sd")

    print("\nSearching for Saturn servers...")
    servers = get_all_saturn_servers()

    if not servers:
        print("\n[FAIL] No Saturn servers found.")
        print("\nMake sure:")
        print("  1. A Saturn server is running (python saturn_files/openrouter_server.py)")
        if not SATURN_AVAILABLE:
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
            if svc.ephemeral_key:
                print(f"  Key:      {svc.ephemeral_key[:20]}...")
            if svc.capabilities:
                print(f"  Caps:     {', '.join(svc.capabilities)}")
            if svc.models:
                print(f"  Models:   {', '.join(svc.models)}")
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
