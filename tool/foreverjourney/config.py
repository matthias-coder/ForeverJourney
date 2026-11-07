import tomllib
from dataclasses import dataclass, field, fields
from pathlib import Path

REALM_TYPES = {"PvP", "PvE", "RP-PvP", "RP-PvE"}
MODES = {"normal", "hardcore"}
STATUSES = {"active", "resting", "retired", "fallen"}


class ConfigError(ValueError):
    pass


@dataclass
class CharConfig:
    status: str | None = None
    mode: str = "normal"
    realm_type: str | None = None
    realm_name: str | None = None
    armory_url: str | None = None


@dataclass
class Config:
    wow_dir: Path
    account: str
    repo_dir: Path
    max_width: int = 1600
    thumb_width: int = 320
    jpeg_quality: int = 80
    show_companions: bool = True
    excluded_characters: list[str] = field(default_factory=list)
    characters: dict[str, CharConfig] = field(default_factory=dict)
    stable_seconds: float = 5.0
    poll_seconds: float = 30.0
    site_url: str | None = None
    branch: str = "main"
    defer_while_wow_running: bool = True
    wow_process_names: list[str] = field(
        default_factory=lambda: ["Wow.exe", "WowClassic.exe", "WowT.exe", "WowB.exe"])
    account_dir: Path = field(init=False)
    screenshot_dir: Path = field(init=False)

    def __post_init__(self):
        self.account_dir = self.wow_dir / "WTF" / "Account" / self.account
        self.screenshot_dir = self.wow_dir / "Screenshots"


def _char_config(char_id: str, raw: dict) -> CharConfig:
    cc = CharConfig(
        status=raw.get("status"),
        mode=raw.get("mode", "normal"),
        realm_type=raw.get("realm_type"),
        realm_name=raw.get("realm_name"),
        armory_url=raw.get("armory_url"),
    )
    if cc.realm_type is not None and cc.realm_type not in REALM_TYPES:
        raise ConfigError(f"[{char_id}] invalid realm_type: {cc.realm_type!r}")
    if cc.mode not in MODES:
        raise ConfigError(f"[{char_id}] invalid mode: {cc.mode!r}")
    if cc.status is not None and cc.status not in STATUSES:
        raise ConfigError(f"[{char_id}] invalid status: {cc.status!r}")
    return cc


REQUIRED_OPTIONS = ("wow_dir", "account", "repo_dir")


def load_config(path: Path) -> Config:
    try:
        data = tomllib.loads(path.read_text(encoding="utf-8"))
    except tomllib.TOMLDecodeError as e:
        raise ConfigError(f"invalid TOML in {path}: {e}") from e
    for key in REQUIRED_OPTIONS:
        if key not in data:
            raise ConfigError(f"missing required option: {key}")
        if not isinstance(data[key], str):
            raise ConfigError(f"option {key} must be a string")
    init_fields = {f.name for f in fields(Config) if f.init}
    kwargs = {}
    for key, value in data.items():
        if key == "characters":
            continue
        if key not in init_fields:
            raise ConfigError(f"unknown option: {key}")
        kwargs[key] = value
    kwargs["wow_dir"] = Path(data["wow_dir"])
    kwargs["repo_dir"] = Path(data["repo_dir"])
    raw_chars = data.get("characters", {})
    if not isinstance(raw_chars, dict):
        raise ConfigError("option characters must be a table")
    characters = {}
    for cid, raw in raw_chars.items():
        if not isinstance(raw, dict):
            raise ConfigError(f"[characters.{cid}] must be a table")
        characters[cid] = _char_config(cid, raw)
    return Config(characters=characters, **kwargs)


def find_export_files(cfg: Config) -> list[Path]:
    return sorted(cfg.account_dir.glob("*/*/SavedVariables/MyCharForever.lua"))
