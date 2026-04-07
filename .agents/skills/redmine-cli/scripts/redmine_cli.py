#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import sys
import urllib.error
import urllib.parse
import urllib.request
from dataclasses import dataclass
from pathlib import Path
from typing import Generic, Literal, Optional, Sequence, TypeVar, Union

T = TypeVar("T")
E = TypeVar("E")


@dataclass(frozen=True)
class Ok(Generic[T]):
    value: T


@dataclass(frozen=True)
class Err(Generic[E]):
    error: E


Result = Union[Ok[T], Err[E]]


ErrorKind = Literal[
    "ConfigError",
    "DecodeError",
    "HttpError",
    "NetworkError",
    "UsageError",
]


@dataclass(frozen=True)
class RedmineError:
    kind: ErrorKind
    message: str
    status: Optional[int] = None
    details: Optional[str] = None


CONFIG_FOLDER = ".red"
CONFIG_FILE = "config.json"


@dataclass(frozen=True)
class InstanceConfig:
    name: str
    server: str
    api_key: str
    project_id: int
    user_id: int


ConfigMode = Literal["v1", "v2"]


@dataclass(frozen=True)
class GlobalConfig:
    mode: ConfigMode
    servers: Sequence[InstanceConfig]
    default_server: int
    editor: str
    pager: str


@dataclass(frozen=True)
class LocalOverride:
    server: Optional[str]
    api_key: Optional[str]
    project_id: Optional[int]
    user_id: Optional[int]
    editor: Optional[str]
    pager: Optional[str]


@dataclass(frozen=True)
class Runtime:
    server: InstanceConfig
    debug: bool
    all_projects: bool
    editor: str
    pager: str


@dataclass(frozen=True)
class RedmineClientConfig:
    base_url: str
    api_key: str
    timeout_sec: float
    debug: bool


def _normalize_base_url(raw: str) -> str:
    trimmed = raw.strip()
    without_trailing = trimmed[:-1] if trimmed.endswith("/") else trimmed
    return without_trailing


def _json_dumps(value: object) -> str:
    return json.dumps(value, indent=2, ensure_ascii=False, sort_keys=True)


def _error_to_stderr(err: RedmineError) -> None:
    status = f" status={err.status}" if err.status is not None else ""
    details = f"\n{err.details}" if err.details else ""
    sys.stderr.write(f"[{err.kind}]{status} {err.message}{details}\n")


def _as_dict(value: object) -> Optional[dict[str, object]]:
    return value if isinstance(value, dict) else None


def _as_list(value: object) -> Optional[list[object]]:
    return value if isinstance(value, list) else None


def _as_str(value: object) -> Optional[str]:
    return value if isinstance(value, str) else None


def _as_int(value: object) -> Optional[int]:
    if isinstance(value, bool):
        return None
    if isinstance(value, int):
        return value
    if isinstance(value, float) and value.is_integer():
        return int(value)
    if isinstance(value, str) and value.isdigit():
        return int(value)
    return None


def _read_json_file(path: Path) -> Result[object, RedmineError]:
    try:
        raw = path.read_text(encoding="utf-8")
    except FileNotFoundError:
        return Err(
            RedmineError(
                kind="ConfigError",
                message="Config file not found.",
                details=str(path),
            )
        )
    except PermissionError as exc:
        return Err(
            RedmineError(
                kind="ConfigError",
                message="No permission to read config file.",
                details=str(exc),
            )
        )
    except UnicodeDecodeError:
        return Err(
            RedmineError(
                kind="ConfigError",
                message="Config file is not valid UTF-8.",
                details=str(path),
            )
        )

    try:
        return Ok(json.loads(raw))
    except json.JSONDecodeError as exc:
        return Err(
            RedmineError(
                kind="ConfigError",
                message="Config file contains invalid JSON.",
                details=f"{path}\n{exc}",
            )
        )


def _parse_instance(item: object) -> Result[InstanceConfig, RedmineError]:
    obj = _as_dict(item)
    if obj is None:
        return Err(
            RedmineError(
                kind="ConfigError",
                message="Invalid server entry in config (expected object).",
            )
        )

    name = _as_str(obj.get("name")) or ""
    server = _as_str(obj.get("server"))
    api_key = _as_str(obj.get("api-key"))
    project_id = _as_int(obj.get("project-id")) or 0
    user_id = _as_int(obj.get("user-id")) or 0

    if not name.strip():
        return Err(
            RedmineError(
                kind="ConfigError",
                message="Invalid server entry: missing 'name'.",
            )
        )
    if not server or not server.strip():
        return Err(
            RedmineError(
                kind="ConfigError",
                message="Invalid server entry: missing 'server'.",
                details=name,
            )
        )
    if not api_key or not api_key.strip():
        return Err(
            RedmineError(
                kind="ConfigError",
                message="Invalid server entry: missing 'api-key'.",
                details=name,
            )
        )

    normalized = _normalize_base_url(server)
    if not (normalized.startswith("http://") or normalized.startswith("https://")):
        return Err(
            RedmineError(
                kind="ConfigError",
                message="Invalid server URL in config. Expected http(s):// URL.",
                details=server,
            )
        )

    return Ok(
        InstanceConfig(
            name=name,
            server=normalized,
            api_key=api_key.strip(),
            project_id=project_id,
            user_id=user_id,
        )
    )


def _parse_global_config(data: object) -> Result[GlobalConfig, RedmineError]:
    obj = _as_dict(data)
    if obj is None:
        return Err(
            RedmineError(
                kind="ConfigError",
                message="Global config must be a JSON object.",
            )
        )

    version = _as_str(obj.get("version"))
    if version is not None:
        servers_raw = _as_list(obj.get("servers"))
        if servers_raw is None:
            return Err(
                RedmineError(
                    kind="ConfigError",
                    message="Invalid v2 config: missing 'servers' list.",
                )
            )

        servers: list[InstanceConfig] = []
        for item in servers_raw:
            parsed = _parse_instance(item)
            if isinstance(parsed, Err):
                return parsed
            servers.append(parsed.value)

        default_server = _as_int(obj.get("default-server")) or 0
        editor = _as_str(obj.get("editor")) or ""
        pager = _as_str(obj.get("pager")) or ""
        return Ok(
            GlobalConfig(
                mode="v2",
                servers=servers,
                default_server=default_server,
                editor=editor,
                pager=pager,
            )
        )

    # v1 (single-instance) format
    server = _as_str(obj.get("server"))
    api_key = _as_str(obj.get("api-key"))
    project_id = _as_int(obj.get("project-id")) or 0
    user_id = _as_int(obj.get("user-id")) or 0
    editor = _as_str(obj.get("editor")) or ""
    pager = _as_str(obj.get("pager")) or ""

    if not server or not server.strip():
        return Err(
            RedmineError(
                kind="ConfigError",
                message="Missing 'server' in config file.",
            )
        )
    if not api_key or not api_key.strip():
        return Err(
            RedmineError(
                kind="ConfigError",
                message="Missing 'api-key' in config file.",
            )
        )

    normalized = _normalize_base_url(server)
    if not (normalized.startswith("http://") or normalized.startswith("https://")):
        return Err(
            RedmineError(
                kind="ConfigError",
                message="Invalid 'server' URL in config file. Expected http(s):// URL.",
                details=server,
            )
        )

    return Ok(
        GlobalConfig(
            mode="v1",
            servers=[
                InstanceConfig(
                    name="default",
                    server=normalized,
                    api_key=api_key.strip(),
                    project_id=project_id,
                    user_id=user_id,
                )
            ],
            default_server=0,
            editor=editor,
            pager=pager,
        )
    )


def _parse_local_override(data: object) -> LocalOverride:
    obj = _as_dict(data)
    if obj is None:
        return LocalOverride(
            server=None,
            api_key=None,
            project_id=None,
            user_id=None,
            editor=None,
            pager=None,
        )

    return LocalOverride(
        server=_as_str(obj.get("server")),
        api_key=_as_str(obj.get("api-key")),
        project_id=_as_int(obj.get("project-id")),
        user_id=_as_int(obj.get("user-id")),
        editor=_as_str(obj.get("editor")),
        pager=_as_str(obj.get("pager")),
    )


def _read_local_override(path: Path, *, debug: bool) -> Result[LocalOverride, RedmineError]:
    if not path.exists():
        return Ok(
            LocalOverride(
                server=None,
                api_key=None,
                project_id=None,
                user_id=None,
                editor=None,
                pager=None,
            )
        )

    parsed = _read_json_file(path)
    if isinstance(parsed, Err):
        return parsed

    if debug:
        sys.stderr.write(f"[DEBUG] Loaded local override: {path}\n")
    return Ok(_parse_local_override(parsed.value))


def _select_server(cfg: GlobalConfig, rid: Optional[str]) -> Result[InstanceConfig, RedmineError]:
    servers = list(cfg.servers)
    if not servers:
        return Err(
            RedmineError(
                kind="ConfigError",
                message="No Redmine servers configured.",
            )
        )

    if rid is None or not rid.strip():
        idx = cfg.default_server
        if 0 <= idx < len(servers):
            return Ok(servers[idx])
        if len(servers) == 1:
            return Ok(servers[0])
        return Err(
            RedmineError(
                kind="ConfigError",
                message="Default server index is out of range.",
                details=str(idx),
            )
        )

    # Backward-compatible single-instance config: accept --rid but ignore it.
    if cfg.mode == "v1":
        return Ok(servers[0])

    raw = rid.strip()
    if raw.isdigit():
        idx = int(raw)
        if 0 <= idx < len(servers):
            return Ok(servers[idx])
        return Err(
            RedmineError(
                kind="ConfigError",
                message="Redmine server ID does not exist.",
                details=raw,
            )
        )

    for server in servers:
        if server.name == raw:
            return Ok(server)

    return Err(
        RedmineError(
            kind="ConfigError",
            message="Redmine server name does not exist.",
            details=raw,
        )
    )


def _apply_local_override(server: InstanceConfig, override: LocalOverride) -> InstanceConfig:
    server_url = server.server
    api_key = server.api_key
    project_id = server.project_id
    user_id = server.user_id

    if override.server is not None and override.server.strip():
        server_url = _normalize_base_url(override.server)
    if override.api_key is not None and override.api_key.strip():
        api_key = override.api_key.strip()
    if override.project_id is not None and override.project_id > 0:
        project_id = override.project_id
    if override.user_id is not None and override.user_id > 0:
        user_id = override.user_id

    return InstanceConfig(
        name=server.name,
        server=server_url,
        api_key=api_key,
        project_id=project_id,
        user_id=user_id,
    )


def _config_paths(config_path: Optional[str]) -> tuple[Path, Path]:
    global_path = Path(config_path).expanduser() if config_path else Path.home() / CONFIG_FOLDER / CONFIG_FILE
    local_path = Path.cwd() / CONFIG_FOLDER / CONFIG_FILE
    return global_path, local_path


def _runtime_from_args(parsed: argparse.Namespace) -> Result[Runtime, RedmineError]:
    global_path, local_path = _config_paths(getattr(parsed, "config", None))

    # Prioritize local config if it exists, otherwise use global
    if local_path.exists():
        if getattr(parsed, "debug", False):
            sys.stderr.write(f"[DEBUG] Using local config: {local_path}\n")
        raw_config = _read_json_file(local_path)
    else:
        raw_config = _read_json_file(global_path)

    if isinstance(raw_config, Err):
        return raw_config

    global_cfg = _parse_global_config(raw_config.value)
    if isinstance(global_cfg, Err):
        return global_cfg

    selected = _select_server(global_cfg.value, getattr(parsed, "rid", None))
    if isinstance(selected, Err):
        return selected

    # Even if we used local as base, we still apply local override for consistency
    override = _read_local_override(local_path, debug=bool(getattr(parsed, "debug", False)))
    if isinstance(override, Err):
        return override

    server = _apply_local_override(selected.value, override.value)
    editor = global_cfg.value.editor
    pager = global_cfg.value.pager
    if override.value.editor is not None and override.value.editor.strip():
        editor = override.value.editor
    if override.value.pager is not None and override.value.pager.strip():
        pager = override.value.pager

    return Ok(
        Runtime(
            server=server,
            debug=bool(getattr(parsed, "debug", False)),
            all_projects=bool(getattr(parsed, "all", False)),
            editor=editor,
            pager=pager,
        )
    )


def _decode_http_body(data: bytes) -> Result[object, RedmineError]:
    if not data:
        return Ok(None)
    try:
        decoded = data.decode("utf-8")
    except UnicodeDecodeError as exc:
        return Err(
            RedmineError(
                kind="DecodeError",
                message="Response body is not valid UTF-8.",
                details=str(exc),
            )
        )

    try:
        return Ok(json.loads(decoded))
    except json.JSONDecodeError:
        # Redmine sometimes returns empty bodies for 204/201; return text as a fallback.
        return Ok(decoded)


class RedmineClient:
    def __init__(self, config: RedmineClientConfig) -> None:
        self._config = config

    def get(self, path: str, params: Optional[dict[str, str]] = None) -> Result[object, RedmineError]:
        return self._request_json("GET", path, params=params, body=None)

    def post(self, path: str, body: object) -> Result[object, RedmineError]:
        return self._request_json("POST", path, params=None, body=body)

    def put(self, path: str, body: object) -> Result[object, RedmineError]:
        return self._request_json("PUT", path, params=None, body=body)

    def delete(self, path: str) -> Result[object, RedmineError]:
        return self._request_json("DELETE", path, params=None, body=None)

    def _request_json(
        self,
        method: str,
        path: str,
        *,
        params: Optional[dict[str, str]],
        body: Optional[object],
    ) -> Result[object, RedmineError]:
        query = urllib.parse.urlencode(params) if params else ""
        url = f"{self._config.base_url}{path}{'?' if query else ''}{query}"

        data: Optional[bytes]
        headers = {
            "Accept": "application/json",
            "X-Redmine-API-Key": self._config.api_key,
        }
        if body is None:
            data = None
        else:
            data = json.dumps(body, ensure_ascii=False).encode("utf-8")
            headers["Content-Type"] = "application/json"

        if self._config.debug:
            sys.stderr.write(f"[DEBUG] {method} {url}\n")

        req = urllib.request.Request(url, data=data, headers=headers, method=method)
        try:
            with urllib.request.urlopen(req, timeout=self._config.timeout_sec) as resp:
                body_bytes = resp.read()
                decoded = _decode_http_body(body_bytes)
                if isinstance(decoded, Err):
                    return decoded
                if self._config.debug:
                    sys.stderr.write(f"[DEBUG] {resp.status} {_json_dumps(decoded.value)}\n")
                return Ok(decoded.value)
        except urllib.error.HTTPError as exc:
            body_bytes = exc.read()
            decoded = _decode_http_body(body_bytes)
            details: Optional[str]
            if isinstance(decoded, Ok):
                details = _json_dumps(decoded.value) if decoded.value is not None else None
            else:
                details = decoded.error.details
            if self._config.debug:
                sys.stderr.write(f"[DEBUG] {exc.code} {details or ''}\n")
            return Err(
                RedmineError(
                    kind="HttpError",
                    message=f"HTTP {exc.code} {exc.reason}",
                    status=int(exc.code),
                    details=details,
                )
            )
        except urllib.error.URLError as exc:
            return Err(
                RedmineError(
                    kind="NetworkError",
                    message="Network error while calling Redmine.",
                    details=str(exc.reason),
                )
            )


def _read_text_source(
    raw: Optional[str],
    from_file: Optional[str],
    *,
    label: str,
    allow_empty: bool,
) -> Result[str, RedmineError]:
    if raw is not None and from_file is not None:
        return Err(
            RedmineError(
                kind="UsageError",
                message=f"Provide either {label} or {label}-file, not both.",
            )
        )

    if from_file is not None:
        if from_file == "-":
            value = sys.stdin.read()
        else:
            try:
                value = Path(from_file).read_text(encoding="utf-8")
            except FileNotFoundError:
                return Err(
                    RedmineError(
                        kind="UsageError",
                        message=f"File not found for {label}-file.",
                        details=from_file,
                    )
                )
            except UnicodeDecodeError:
                return Err(
                    RedmineError(
                        kind="UsageError",
                        message=f"File is not valid UTF-8 for {label}-file.",
                        details=from_file,
                    )
                )

        if not allow_empty and not value.strip():
            return Err(
                RedmineError(
                    kind="UsageError",
                    message=f"{label} cannot be empty.",
                )
            )
        return Ok(value)

    if raw is None:
        return Err(
            RedmineError(
                kind="UsageError",
                message=f"Missing {label}.",
            )
        )

    if not allow_empty and not raw.strip():
        return Err(
            RedmineError(
                kind="UsageError",
                message=f"{label} cannot be empty.",
            )
        )
    return Ok(raw)


def _build_sort(sort: str, *, asc: bool, allowed: Sequence[str], default: str) -> str:
    raw = sort.strip()
    field = raw if raw in allowed else default
    if asc:
        return field
    return f"{field}:desc"


def _extract_nested_name(item: object, key: str) -> str:
    obj = _as_dict(item)
    if obj is None:
        return ""
    nested = _as_dict(obj.get(key))
    if nested is None:
        return ""
    name = _as_str(nested.get("name"))
    return name or ""


def _extract_int(item: object, key: str) -> Optional[int]:
    obj = _as_dict(item)
    if obj is None:
        return None
    return _as_int(obj.get(key))


def _extract_str(item: object, key: str) -> str:
    obj = _as_dict(item)
    if obj is None:
        return ""
    value = _as_str(obj.get(key))
    return value or ""


def _handle_issue_list(runtime: Runtime, parsed: argparse.Namespace) -> int:
    client = RedmineClient(
        RedmineClientConfig(
            base_url=runtime.server.server,
            api_key=runtime.server.api_key,
            timeout_sec=20.0,
            debug=runtime.debug,
        )
    )

    project_id = 0 if runtime.all_projects else runtime.server.project_id

    limit = int(parsed.limit)
    page = int(parsed.page)
    offset = int(parsed.offset) if page <= 0 else page * limit

    params: dict[str, str] = {
        "limit": str(limit),
        "offset": str(offset),
        "sort": _build_sort(
            parsed.sort,
            asc=bool(parsed.asc),
            allowed=["id", "status", "priority", "subject", "project"],
            default="priority",
        ),
    }
    if project_id > 0:
        params["project_id"] = str(project_id)
    if parsed.query:
        params["subject"] = f"~{parsed.query}"
    if int(parsed.target_id) > 0:
        params["fixed_version_id"] = str(int(parsed.target_id))
    if int(parsed.status_id) > 0:
        params["status_id"] = str(int(parsed.status_id))

    assigned_to: Optional[str] = getattr(parsed, "assigned_to", None)
    if assigned_to is not None and assigned_to.strip():
        params["assigned_to_id"] = assigned_to.strip()

    result = client.get("/issues.json", params=params)
    if isinstance(result, Err):
        _error_to_stderr(result.error)
        return 1

    if parsed.json:
        sys.stdout.write(_json_dumps(result.value) + "\n")
        return 0

    root = _as_dict(result.value)
    if root is None:
        sys.stdout.write(str(result.value) + "\n")
        return 0

    issues = root.get("issues")
    if not isinstance(issues, list):
        sys.stdout.write(_json_dumps(result.value) + "\n")
        return 0

    if parsed.issue_urls:
        for item in issues:
            issue_id = _extract_int(item, "id")
            if issue_id is None:
                continue
            sys.stdout.write(f"{runtime.server.server}/issues/{issue_id}\n")
        return 0

    show_project = bool(parsed.project)
    for item in issues:
        issue_id = _extract_int(item, "id")
        if issue_id is None:
            continue
        tracker = _extract_nested_name(item, "tracker")
        status = _extract_nested_name(item, "status")
        priority = _extract_nested_name(item, "priority")
        fixed_version = _extract_nested_name(item, "fixed_version")
        subject = _extract_str(item, "subject")
        project_name = _extract_nested_name(item, "project")

        if show_project:
            sys.stdout.write(
                f"{issue_id}\t{tracker}\t{status}\t{priority}\t{fixed_version}\t{subject}\t{project_name}\n"
            )
        else:
            sys.stdout.write(
                f"{issue_id}\t{tracker}\t{status}\t{priority}\t{fixed_version}\t{subject}\n"
            )

    return 0


def _handle_issue_list_all(runtime: Runtime, parsed: argparse.Namespace) -> int:
    forced = Runtime(
        server=runtime.server,
        debug=runtime.debug,
        all_projects=True,
        editor=runtime.editor,
        pager=runtime.pager,
    )
    return _handle_issue_list(forced, parsed)


def _handle_issue_list_me(runtime: Runtime, parsed: argparse.Namespace) -> int:
    # Mirror red-cli behaviour: assigned_to_id=me
    setattr(parsed, "assigned_to", "me")
    return _handle_issue_list(runtime, parsed)


def _handle_issue_view(runtime: Runtime, parsed: argparse.Namespace) -> int:
    client = RedmineClient(
        RedmineClientConfig(
            base_url=runtime.server.server,
            api_key=runtime.server.api_key,
            timeout_sec=20.0,
            debug=runtime.debug,
        )
    )

    params: Optional[dict[str, str]]
    if parsed.journals:
        params = {"include": "journals"}
    else:
        params = None

    result = client.get(f"/issues/{parsed.id}.json", params=params)
    if isinstance(result, Err):
        _error_to_stderr(result.error)
        return 1
    sys.stdout.write(_json_dumps(result.value) + "\n")
    return 0


def _handle_issue_note(runtime: Runtime, parsed: argparse.Namespace) -> int:
    message = _read_text_source(
        parsed.message,
        parsed.message_file,
        label="--message",
        allow_empty=False,
    )
    if isinstance(message, Err):
        _error_to_stderr(message.error)
        return 2

    client = RedmineClient(
        RedmineClientConfig(
            base_url=runtime.server.server,
            api_key=runtime.server.api_key,
            timeout_sec=20.0,
            debug=runtime.debug,
        )
    )

    issue_payload: dict[str, object] = {"notes": message.value}
    if bool(parsed.private):
        issue_payload["private_notes"] = True

    result = client.put(f"/issues/{parsed.id}.json", body={"issue": issue_payload})
    if isinstance(result, Err):
        _error_to_stderr(result.error)
        return 1

    sys.stdout.write(_json_dumps(result.value) + "\n" if bool(parsed.json) else "OK\n")
    return 0


def _resolve_project_id(runtime: Runtime, parsed: argparse.Namespace) -> Result[int, RedmineError]:
    cli_project_id = getattr(parsed, "project_id", None)
    if cli_project_id is not None and int(cli_project_id) > 0:
        return Ok(int(cli_project_id))
    if runtime.server.project_id > 0:
        return Ok(runtime.server.project_id)
    return Err(
        RedmineError(
            kind="UsageError",
            message="Missing project id. Provide --project-id or set project-id in config.",
        )
    )


DEFAULT_TRACKER_NAME = "Task"


def _resolve_tracker_id(
    client: RedmineClient,
    tracker_id: Optional[int],
    tracker_name: Optional[str],
) -> Result[Optional[int], RedmineError]:
    if tracker_id is not None and tracker_id > 0:
        return Ok(tracker_id)
    name = (tracker_name or DEFAULT_TRACKER_NAME).strip()
    if not name:
        return Ok(None)
    result = client.get("/trackers.json")
    if isinstance(result, Err):
        return result
    trackers = _extract_id_name_list(result.value, "trackers")
    lower_name = name.lower()
    for entry in trackers:
        entry_name = _as_str(entry.get("name"))
        if entry_name is not None and entry_name.lower() == lower_name:
            return Ok(_as_int(entry.get("id")))
    return Err(
        RedmineError(
            kind="UsageError",
            message=f"Tracker '{name}' not found. Use 'issue meta' to list available trackers.",
        )
    )


def _build_issue_create_payload(
    project_id: int,
    subject: str,
    description: Optional[str],
    tracker_id: Optional[int],
    status_id: Optional[int],
    priority_id: Optional[int],
    assigned_to_id: Optional[int],
    fixed_version_id: Optional[int],
    parent_id: Optional[int],
) -> dict[str, object]:
    issue: dict[str, object] = {
        "project_id": project_id,
        "subject": subject,
    }
    if description is not None:
        issue["description"] = description
    if tracker_id is not None and tracker_id > 0:
        issue["tracker_id"] = tracker_id
    if status_id is not None and status_id > 0:
        issue["status_id"] = status_id
    if priority_id is not None and priority_id > 0:
        issue["priority_id"] = priority_id
    if assigned_to_id is not None and assigned_to_id > 0:
        issue["assigned_to_id"] = assigned_to_id
    if fixed_version_id is not None and fixed_version_id > 0:
        issue["fixed_version_id"] = fixed_version_id
    if parent_id is not None and parent_id > 0:
        issue["parent_issue_id"] = parent_id
    return {"issue": issue}


def _extract_id_name_list(data: object, key: str) -> list[dict[str, object]]:
    root = _as_dict(data)
    if root is None:
        return []
    items = _as_list(root.get(key))
    if items is None:
        return []
    result: list[dict[str, object]] = []
    for item in items:
        obj = _as_dict(item)
        if obj is None:
            continue
        entry_id = _as_int(obj.get("id"))
        entry_name = _as_str(obj.get("name"))
        if entry_id is not None and entry_name is not None:
            result.append({"id": entry_id, "name": entry_name})
    return result


def _handle_issue_meta(runtime: Runtime, parsed: argparse.Namespace) -> int:
    client = RedmineClient(
        RedmineClientConfig(
            base_url=runtime.server.server,
            api_key=runtime.server.api_key,
            timeout_sec=20.0,
            debug=runtime.debug,
        )
    )

    projects_result = client.get("/projects.json", params={"limit": "100"})
    trackers_result = client.get("/trackers.json")
    statuses_result = client.get("/issue_statuses.json")
    priorities_result = client.get("/enumerations/issue_priorities.json")

    results: list[tuple[str, str, Result[object, RedmineError]]] = [
        ("projects", "projects", projects_result),
        ("trackers", "trackers", trackers_result),
        ("statuses", "issue_statuses", statuses_result),
        ("priorities", "issue_priorities", priorities_result),
    ]

    meta: dict[str, object] = {}
    for label, json_key, res in results:
        if isinstance(res, Err):
            _error_to_stderr(
                RedmineError(
                    kind=res.error.kind,
                    message=f"Failed to fetch {label}: {res.error.message}",
                    status=res.error.status,
                    details=res.error.details,
                )
            )
            return 1
        meta[label] = _extract_id_name_list(res.value, json_key)

    sys.stdout.write(_json_dumps(meta) + "\n")
    return 0


def _handle_issue_create(runtime: Runtime, parsed: argparse.Namespace) -> int:
    subject = getattr(parsed, "subject", None)
    if not subject or not subject.strip():
        _error_to_stderr(
            RedmineError(
                kind="UsageError",
                message="Missing --subject.",
            )
        )
        return 2

    resolved_pid = _resolve_project_id(runtime, parsed)
    if isinstance(resolved_pid, Err):
        _error_to_stderr(resolved_pid.error)
        return 2

    description: Optional[str] = None
    raw_desc = getattr(parsed, "description", None)
    desc_file = getattr(parsed, "description_file", None)
    if raw_desc is not None or desc_file is not None:
        desc_result = _read_text_source(
            raw_desc, desc_file, label="--description", allow_empty=True,
        )
        if isinstance(desc_result, Err):
            _error_to_stderr(desc_result.error)
            return 2
        description = desc_result.value

    client = RedmineClient(
        RedmineClientConfig(
            base_url=runtime.server.server,
            api_key=runtime.server.api_key,
            timeout_sec=20.0,
            debug=runtime.debug,
        )
    )

    resolved_tracker = _resolve_tracker_id(
        client,
        _as_int(getattr(parsed, "tracker_id", None)),
        getattr(parsed, "tracker", None),
    )
    if isinstance(resolved_tracker, Err):
        _error_to_stderr(resolved_tracker.error)
        return 1

    payload = _build_issue_create_payload(
        project_id=resolved_pid.value,
        subject=subject.strip(),
        description=description,
        tracker_id=resolved_tracker.value,
        status_id=_as_int(getattr(parsed, "create_status_id", None)),
        priority_id=_as_int(getattr(parsed, "priority_id", None)),
        assigned_to_id=_as_int(getattr(parsed, "assigned_to_id", None)),
        fixed_version_id=_as_int(getattr(parsed, "fixed_version_id", None)),
        parent_id=_as_int(getattr(parsed, "parent_id", None)),
    )

    result = client.post("/issues.json", body=payload)
    if isinstance(result, Err):
        _error_to_stderr(result.error)
        return 1

    sys.stdout.write(_json_dumps(result.value) + "\n" if bool(parsed.json) else "OK\n")
    return 0


def _handle_issue_edit(runtime: Runtime, parsed: argparse.Namespace) -> int:
    issue_fields: dict[str, object] = {}

    raw_desc = getattr(parsed, "description", None)
    desc_file = getattr(parsed, "description_file", None)
    if raw_desc is not None or desc_file is not None:
        description = _read_text_source(
            raw_desc, desc_file, label="--description", allow_empty=False,
        )
        if isinstance(description, Err):
            _error_to_stderr(description.error)
            return 2
        issue_fields["description"] = description.value

    subject = getattr(parsed, "subject", None)
    if subject is not None and subject.strip():
        issue_fields["subject"] = subject.strip()

    for attr, key in [
        ("edit_tracker_id", "tracker_id"),
        ("edit_status_id", "status_id"),
        ("edit_priority_id", "priority_id"),
        ("edit_assigned_to_id", "assigned_to_id"),
        ("edit_fixed_version_id", "fixed_version_id"),
        ("edit_parent_id", "parent_issue_id"),
    ]:
        val = _as_int(getattr(parsed, attr, None))
        if val is not None and val > 0:
            issue_fields[key] = val

    if not issue_fields:
        _error_to_stderr(
            RedmineError(
                kind="UsageError",
                message="No fields to update. Provide at least one of --subject, --description, --tracker-id, --status-id, --priority-id, --assigned-to-id, --fixed-version-id, --parent-id.",
            )
        )
        return 2

    client = RedmineClient(
        RedmineClientConfig(
            base_url=runtime.server.server,
            api_key=runtime.server.api_key,
            timeout_sec=20.0,
            debug=runtime.debug,
        )
    )

    result = client.put(f"/issues/{parsed.id}.json", body={"issue": issue_fields})
    if isinstance(result, Err):
        _error_to_stderr(result.error)
        return 1

    sys.stdout.write(_json_dumps(result.value) + "\n" if bool(parsed.json) else "OK\n")
    return 0


def _journal_update_payload(
    notes: str, *, private_notes: Optional[bool]
) -> dict[str, object]:
    payload: dict[str, object] = {"notes": notes}
    if private_notes is not None:
        payload["private_notes"] = private_notes
    return payload


def _handle_comment_update(runtime: Runtime, parsed: argparse.Namespace) -> int:
    message = _read_text_source(
        parsed.message,
        parsed.message_file,
        label="--message",
        allow_empty=False,
    )
    if isinstance(message, Err):
        _error_to_stderr(message.error)
        return 2

    private_notes: Optional[bool]
    if bool(parsed.private) and bool(parsed.public):
        _error_to_stderr(
            RedmineError(
                kind="UsageError",
                message="Provide at most one of --private or --public.",
            )
        )
        return 2
    if bool(parsed.private):
        private_notes = True
    elif bool(parsed.public):
        private_notes = False
    else:
        private_notes = None

    client = RedmineClient(
        RedmineClientConfig(
            base_url=runtime.server.server,
            api_key=runtime.server.api_key,
            timeout_sec=20.0,
            debug=runtime.debug,
        )
    )

    payload = {"journal": _journal_update_payload(message.value, private_notes=private_notes)}
    result = client.put(f"/journals/{parsed.journal_id}.json", body=payload)
    if isinstance(result, Err):
        _error_to_stderr(result.error)
        return 1

    sys.stdout.write(_json_dumps(result.value) + "\n" if bool(parsed.json) else "OK\n")
    return 0


def _handle_comment_remove(runtime: Runtime, parsed: argparse.Namespace) -> int:
    client = RedmineClient(
        RedmineClientConfig(
            base_url=runtime.server.server,
            api_key=runtime.server.api_key,
            timeout_sec=20.0,
            debug=runtime.debug,
        )
    )

    payload = {"journal": {"notes": ""}}
    result = client.put(f"/journals/{parsed.journal_id}.json", body=payload)
    if isinstance(result, Err):
        if result.error.kind == "HttpError" and result.error.status == 404:
            sys.stdout.write(_json_dumps(None) + "\n" if bool(parsed.json) else "OK\n")
            return 0
        _error_to_stderr(result.error)
        return 1

    sys.stdout.write(_json_dumps(result.value) + "\n" if bool(parsed.json) else "OK\n")
    return 0


RELATION_TYPES = (
    "relates", "duplicates", "duplicated", "blocks", "blocked",
    "precedes", "follows", "copied_to", "copied_from",
)


def _handle_relation_add(runtime: Runtime, parsed: argparse.Namespace) -> int:
    relation_type = getattr(parsed, "relation_type", "relates")
    if relation_type not in RELATION_TYPES:
        _error_to_stderr(
            RedmineError(
                kind="UsageError",
                message=f"Invalid relation type '{relation_type}'. Must be one of: {', '.join(RELATION_TYPES)}",
            )
        )
        return 2

    client = RedmineClient(
        RedmineClientConfig(
            base_url=runtime.server.server,
            api_key=runtime.server.api_key,
            timeout_sec=20.0,
            debug=runtime.debug,
        )
    )

    payload = {"relation": {"issue_to_id": parsed.target_id, "relation_type": relation_type}}
    result = client.post(f"/issues/{parsed.id}/relations.json", body=payload)
    if isinstance(result, Err):
        _error_to_stderr(result.error)
        return 1

    sys.stdout.write(_json_dumps(result.value) + "\n" if bool(parsed.json) else "OK\n")
    return 0


def _handle_relation_list(runtime: Runtime, parsed: argparse.Namespace) -> int:
    client = RedmineClient(
        RedmineClientConfig(
            base_url=runtime.server.server,
            api_key=runtime.server.api_key,
            timeout_sec=20.0,
            debug=runtime.debug,
        )
    )

    result = client.get(f"/issues/{parsed.id}/relations.json")
    if isinstance(result, Err):
        _error_to_stderr(result.error)
        return 1

    if bool(parsed.json):
        sys.stdout.write(_json_dumps(result.value) + "\n")
        return 0

    root = _as_dict(result.value)
    if root is None:
        sys.stdout.write(str(result.value) + "\n")
        return 0

    relations = _as_list(root.get("relations"))
    if relations is None:
        sys.stdout.write(_json_dumps(result.value) + "\n")
        return 0

    for item in relations:
        obj = _as_dict(item)
        if obj is None:
            continue
        rel_id = _as_int(obj.get("id"))
        issue_id = _as_int(obj.get("issue_id"))
        issue_to_id = _as_int(obj.get("issue_to_id"))
        rel_type = _as_str(obj.get("relation_type")) or ""
        if rel_id is not None:
            sys.stdout.write(f"{rel_id}\t{issue_id}\t{rel_type}\t{issue_to_id}\n")

    return 0


def _handle_relation_remove(runtime: Runtime, parsed: argparse.Namespace) -> int:
    client = RedmineClient(
        RedmineClientConfig(
            base_url=runtime.server.server,
            api_key=runtime.server.api_key,
            timeout_sec=20.0,
            debug=runtime.debug,
        )
    )

    result = client.delete(f"/relations/{parsed.relation_id}.json")
    if isinstance(result, Err):
        _error_to_stderr(result.error)
        return 1

    sys.stdout.write(_json_dumps(result.value) + "\n" if bool(parsed.json) else "OK\n")
    return 0


def _handle_project_list(runtime: Runtime, parsed: argparse.Namespace) -> int:
    client = RedmineClient(
        RedmineClientConfig(
            base_url=runtime.server.server,
            api_key=runtime.server.api_key,
            timeout_sec=20.0,
            debug=runtime.debug,
        )
    )

    limit = int(parsed.limit)
    page = int(parsed.page)
    offset = int(parsed.offset) if page <= 0 else page * limit

    params: dict[str, str] = {
        "limit": str(limit),
        "offset": str(offset),
        "sort": _build_sort(
            parsed.sort,
            asc=bool(parsed.asc),
            allowed=["id", "name"],
            default="name",
        ),
    }
    if parsed.query:
        params["name"] = f"~{parsed.query}"

    result = client.get("/projects.json", params=params)
    if isinstance(result, Err):
        _error_to_stderr(result.error)
        return 1

    if parsed.json:
        sys.stdout.write(_json_dumps(result.value) + "\n")
        return 0

    root = _as_dict(result.value)
    if root is None:
        sys.stdout.write(str(result.value) + "\n")
        return 0

    projects = root.get("projects")
    if not isinstance(projects, list):
        sys.stdout.write(_json_dumps(result.value) + "\n")
        return 0

    for item in projects:
        pid = _extract_int(item, "id")
        name = _extract_str(item, "name")
        if pid is None:
            continue
        sys.stdout.write(f"{pid}\t{name}\n")

    return 0


def _handle_user_me(runtime: Runtime, parsed: argparse.Namespace) -> int:
    client = RedmineClient(
        RedmineClientConfig(
            base_url=runtime.server.server,
            api_key=runtime.server.api_key,
            timeout_sec=20.0,
            debug=runtime.debug,
        )
    )
    result = client.get("/users/current.json", params=None)
    if isinstance(result, Err):
        _error_to_stderr(result.error)
        return 1
    sys.stdout.write(_json_dumps(result.value) + "\n")
    return 0


def _add_common_flags(parser: argparse.ArgumentParser) -> None:
    parser.add_argument("--all", action="store_true", help="Ignore project-id")
    parser.add_argument(
        "--rid",
        help="Redmine instance ID (for multi-instance support). Works with v2 config servers (name or index).",
    )
    parser.add_argument(
        "-d",
        "--debug",
        action="store_true",
        help="Show debug info and raw response",
    )
    parser.add_argument(
        "--config",
        help="Global config path (default: ~/.red/config.json)",
    )


def _flags_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(add_help=False)
    _add_common_flags(p)
    return p


def _add_paging_flags(p: argparse.ArgumentParser) -> None:
    p.add_argument("--asc", action="store_true", help="Ascend order")
    p.add_argument("-s", "--sort", default="", help="Sort field")
    p.add_argument("-p", "--page", type=int, default=0, help="List 25 objects per page (uses limit and offset)")
    p.add_argument("-l", "--limit", type=int, default=25, help="Limit number of objects per page")
    p.add_argument("-o", "--offset", type=int, default=0, help="skip this number of objects")
    p.add_argument("--target_id", "--target-id", dest="target_id", type=int, default=0, help="Filter on target version ID")
    p.add_argument("--status_id", "--status-id", dest="status_id", type=int, default=0, help="Filter on status ID")
    p.add_argument("--json", action="store_true", help="Output in JSON format")


def _build_parser() -> argparse.ArgumentParser:
    common = _flags_parser()
    parser = argparse.ArgumentParser(
        prog="red-cli",
        description="Redmine CLI for integration with Redmine API",
        parents=[common],
    )

    subparsers = parser.add_subparsers(dest="command", required=True)

    issue = subparsers.add_parser("issue", help="issue", parents=[common], aliases=["issues"])
    issue_sub = issue.add_subparsers(dest="issue_cmd", required=True)

    issue_list_flags = argparse.ArgumentParser(add_help=False)
    _add_paging_flags(issue_list_flags)
    issue_list_flags.add_argument("--issue-urls", action="store_true", help="Show issue urls only")
    issue_list_flags.add_argument("--project", action="store_true", help="Display project column")
    issue_list_flags.add_argument("-q", "--query", default="", help="Query for issues with subject")
    issue_list_flags.add_argument(
        "--assigned-to",
        dest="assigned_to",
        default="",
        help="assigned_to_id filter (use 'me' to mirror red-cli list me)",
    )

    issue_list = issue_sub.add_parser("list", help="List issues", parents=[common, issue_list_flags])
    issue_list.set_defaults(_handler=_handle_issue_list)

    list_sub = issue_list.add_subparsers(dest="issue_list_cmd", required=False)
    issue_list_all = list_sub.add_parser("all", help="List all issues", parents=[common, issue_list_flags])
    issue_list_all.set_defaults(_handler=_handle_issue_list_all)
    issue_list_me = list_sub.add_parser("me", help="List all my issues", parents=[common, issue_list_flags])
    issue_list_me.set_defaults(_handler=_handle_issue_list_me)

    issue_create_flags = argparse.ArgumentParser(add_help=False)
    issue_create_flags.add_argument("--subject", required=True, help="Issue subject (required)")
    issue_create_flags.add_argument(
        "--project-id", dest="project_id", type=int, default=0,
        help="Project id (overrides config project-id)",
    )
    issue_create_flags.add_argument("--description", default=None, help="Issue description")
    issue_create_flags.add_argument(
        "--description-file", default=None,
        help="Read description from file (use '-' for stdin)",
    )
    issue_create_flags.add_argument("--tracker-id", dest="tracker_id", type=int, default=0, help="Tracker id (overrides --tracker)")
    issue_create_flags.add_argument("--tracker", default=None, help="Tracker name (default: Task)")
    issue_create_flags.add_argument(
        "--status-id", dest="create_status_id", type=int, default=0, help="Status id",
    )
    issue_create_flags.add_argument("--priority-id", dest="priority_id", type=int, default=0, help="Priority id")
    issue_create_flags.add_argument("--assigned-to-id", dest="assigned_to_id", type=int, default=0, help="Assigned-to user id")
    issue_create_flags.add_argument("--fixed-version-id", dest="fixed_version_id", type=int, default=0, help="Target version id")
    issue_create_flags.add_argument("--parent-id", dest="parent_id", type=int, default=0, help="Parent issue id")
    issue_create_flags.add_argument("--json", action="store_true", help="Output in JSON format")
    issue_create = issue_sub.add_parser(
        "create", help="Create a new issue", parents=[common, issue_create_flags], aliases=["new"],
    )
    issue_create.set_defaults(_handler=_handle_issue_create)

    issue_meta = issue_sub.add_parser(
        "meta", help="List projects, trackers, statuses, and priorities", parents=[common],
    )
    issue_meta.set_defaults(_handler=_handle_issue_meta)

    issue_view_flags = argparse.ArgumentParser(add_help=False)
    issue_view_flags.add_argument("-j", "--journals", action="store_true", help="Display journals")
    issue_view = issue_sub.add_parser("view", help="View issue", parents=[common, issue_view_flags])
    issue_view.add_argument("id", type=int, help="Issue id")
    issue_view.set_defaults(_handler=_handle_issue_view)

    # Convenience alias for users who expect "get"
    issue_get = issue_sub.add_parser("get", help="Get issue", parents=[common, issue_view_flags])
    issue_get.add_argument("id", type=int, help="Issue id")
    issue_get.set_defaults(_handler=_handle_issue_view)

    issue_note_flags = argparse.ArgumentParser(add_help=False)
    issue_note_flags.add_argument("-m", "--message", default=None, help="Message to post as a note")
    issue_note_flags.add_argument(
        "--message-file", default=None,
        help="Read note message from file (use '-' for stdin)",
    )
    issue_note_flags.add_argument("-p", "--private", action="store_true", help="Post the note as private (private_notes)")
    issue_note_flags.add_argument("--json", action="store_true", help="Output in JSON format")
    issue_note = issue_sub.add_parser("note", help="Add a note to an issue", parents=[common, issue_note_flags])
    issue_note.add_argument("id", type=int, help="Issue id")
    issue_note.set_defaults(_handler=_handle_issue_note)

    issue_edit_flags = argparse.ArgumentParser(add_help=False)
    issue_edit_flags.add_argument("--subject", default=None, help="New subject")
    issue_edit_flags.add_argument(
        "--description", default=None,
        help="New issue description (use --description-file for multiline)",
    )
    issue_edit_flags.add_argument(
        "--description-file", default=None,
        help="Read new issue description from file (use '-' for stdin)",
    )
    issue_edit_flags.add_argument("--tracker-id", dest="edit_tracker_id", type=int, default=0, help="Tracker id")
    issue_edit_flags.add_argument("--status-id", dest="edit_status_id", type=int, default=0, help="Status id")
    issue_edit_flags.add_argument("--priority-id", dest="edit_priority_id", type=int, default=0, help="Priority id")
    issue_edit_flags.add_argument("--assigned-to-id", dest="edit_assigned_to_id", type=int, default=0, help="Assigned-to user id")
    issue_edit_flags.add_argument("--fixed-version-id", dest="edit_fixed_version_id", type=int, default=0, help="Target version id")
    issue_edit_flags.add_argument("--parent-id", dest="edit_parent_id", type=int, default=0, help="Parent issue id")
    issue_edit_flags.add_argument("--json", action="store_true", help="Output in JSON format")
    issue_edit = issue_sub.add_parser(
        "edit", help="Edit issue fields", parents=[common, issue_edit_flags]
    )
    issue_edit.add_argument("id", type=int, help="Issue id")
    issue_edit.set_defaults(_handler=_handle_issue_edit)

    relate = issue_sub.add_parser(
        "relate", help="Manage issue relations", parents=[common], aliases=["relation", "relations"],
    )
    relate_sub = relate.add_subparsers(dest="relate_cmd", required=True)

    relate_add_flags = argparse.ArgumentParser(add_help=False)
    relate_add_flags.add_argument(
        "--type", dest="relation_type", default="relates",
        help="Relation type: relates, duplicates, duplicated, blocks, blocked, precedes, follows, copied_to, copied_from (default: relates)",
    )
    relate_add_flags.add_argument("--json", action="store_true", help="Output in JSON format")
    relate_add = relate_sub.add_parser(
        "add", help="Add a relation between issues", parents=[common, relate_add_flags],
    )
    relate_add.add_argument("id", type=int, help="Source issue id")
    relate_add.add_argument("target_id", type=int, help="Target issue id")
    relate_add.set_defaults(_handler=_handle_relation_add)

    relate_list_flags = argparse.ArgumentParser(add_help=False)
    relate_list_flags.add_argument("--json", action="store_true", help="Output in JSON format")
    relate_list = relate_sub.add_parser(
        "list", help="List relations of an issue", parents=[common, relate_list_flags],
    )
    relate_list.add_argument("id", type=int, help="Issue id")
    relate_list.set_defaults(_handler=_handle_relation_list)

    relate_remove_flags = argparse.ArgumentParser(add_help=False)
    relate_remove_flags.add_argument("--json", action="store_true", help="Output in JSON format")
    relate_remove = relate_sub.add_parser(
        "remove", help="Remove a relation", parents=[common, relate_remove_flags],
        aliases=["delete"],
    )
    relate_remove.add_argument("relation_id", type=int, help="Relation id")
    relate_remove.set_defaults(_handler=_handle_relation_remove)

    comment = issue_sub.add_parser(
        "comment", help="Manage comments (journals)", parents=[common], aliases=["comments", "journal", "journals"]
    )
    comment_sub = comment.add_subparsers(dest="comment_cmd", required=True)

    comment_update_flags = argparse.ArgumentParser(add_help=False)
    comment_update_flags.add_argument(
        "-m",
        "--message",
        default=None,
        help="New comment body (use --message-file for multiline)",
    )
    comment_update_flags.add_argument(
        "--message-file",
        default=None,
        help="Read new comment body from file (use '-' for stdin)",
    )
    comment_update_flags.add_argument(
        "--private", action="store_true", help="Set comment to private"
    )
    comment_update_flags.add_argument(
        "--public", action="store_true", help="Set comment to public"
    )
    comment_update_flags.add_argument("--json", action="store_true", help="Output in JSON format")

    comment_update = comment_sub.add_parser(
        "update", help="Update a comment (journal)", parents=[common, comment_update_flags]
    )
    comment_update.add_argument("journal_id", type=int, help="Journal id (comment id)")
    comment_update.set_defaults(_handler=_handle_comment_update)

    comment_remove_flags = argparse.ArgumentParser(add_help=False)
    comment_remove_flags.add_argument("--json", action="store_true", help="Output in JSON format")
    comment_remove = comment_sub.add_parser(
        "remove",
        help="Remove a comment by clearing its notes",
        parents=[common, comment_remove_flags],
        aliases=["delete", "clear"],
    )
    comment_remove.add_argument("journal_id", type=int, help="Journal id (comment id)")
    comment_remove.set_defaults(_handler=_handle_comment_remove)

    project = subparsers.add_parser("project", help="project", parents=[common], aliases=["projects"])
    project_sub = project.add_subparsers(dest="project_cmd", required=True)

    project_list_flags = argparse.ArgumentParser(add_help=False)
    _add_paging_flags(project_list_flags)
    project_list_flags.add_argument("-q", "--query", default="", help="Query for projects with name")

    project_list = project_sub.add_parser("list", help="List projects", parents=[common, project_list_flags])
    project_list.set_defaults(_handler=_handle_project_list)

    project_list_sub = project_list.add_subparsers(dest="project_list_cmd", required=False)
    project_list_all = project_list_sub.add_parser(
        "all",
        help="List all projects",
        parents=[common, project_list_flags],
    )
    project_list_all.set_defaults(_handler=_handle_project_list)

    user = subparsers.add_parser("user", help="Get users info", parents=[common], aliases=["users"])
    user_sub = user.add_subparsers(dest="user_cmd", required=True)
    user_me = user_sub.add_parser("me", help="Display my info", parents=[common])
    user_me.set_defaults(_handler=_handle_user_me)

    return parser


def main(argv: Sequence[str]) -> int:
    parser = _build_parser()
    parsed = parser.parse_args(argv)

    runtime = _runtime_from_args(parsed)
    if isinstance(runtime, Err):
        _error_to_stderr(runtime.error)
        return 2

    handler = getattr(parsed, "_handler", None)
    if handler is None:
        _error_to_stderr(
            RedmineError(
                kind="UsageError",
                message="No handler configured for command.",
            )
        )
        return 2

    return int(handler(runtime.value, parsed))


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
