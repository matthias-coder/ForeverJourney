"""CLI: python -m foreverjourney [sync|watch|tray] [--config PATH]."""
import argparse
import logging
import sys
import time
from logging.handlers import RotatingFileHandler
from pathlib import Path

from .app import App
from .config import ConfigError, load_config
from .notify import windows_toast

TOOL_DIR = Path(__file__).resolve().parent.parent


def _setup_logging(console: bool) -> logging.Logger:
    log = logging.getLogger("foreverjourney")
    log.setLevel(logging.INFO)
    fmt = logging.Formatter("%(asctime)s %(levelname)s %(message)s")
    fh = RotatingFileHandler(TOOL_DIR / "foreverjourney.log", maxBytes=1_000_000,
                             backupCount=3, encoding="utf-8")
    fh.setFormatter(fmt)
    log.addHandler(fh)
    if console:
        sh = logging.StreamHandler()
        sh.setFormatter(fmt)
        log.addHandler(sh)
    return log


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(prog="foreverjourney")
    ap.add_argument("command", nargs="?", default="tray", choices=["sync", "watch", "tray"])
    ap.add_argument("--config", type=Path, default=TOOL_DIR / "config.toml")
    args = ap.parse_args(argv)
    try:
        cfg = load_config(args.config)
    except FileNotFoundError:
        print(f"Konfiguration {args.config} fehlt. Bitte config.example.toml nach config.toml "
              "kopieren und ausfüllen.", file=sys.stderr)
        return 2
    except (ConfigError, OSError) as e:
        print(f"Konfiguration {args.config} ist ungültig: {e}. Siehe config.example.toml.",
              file=sys.stderr)
        return 2
    missing = [p for p in (cfg.account_dir, cfg.repo_dir) if not p.exists()]
    if missing:
        print("Pfade existieren nicht: " + ", ".join(str(p) for p in missing)
              + ". Bitte config.toml prüfen (siehe config.example.toml).", file=sys.stderr)
        return 2
    log = _setup_logging(console=args.command != "tray")
    notifier = (lambda t, x: None) if args.command == "sync" else windows_toast
    app = App(cfg, notifier=notifier, log=log)
    if args.command == "sync":
        print(app.run_sync("cli"))
        return 1 if app.had_error else 0
    if args.command == "watch":
        app.start_watching()
        print("Beobachte Exporte, Strg+C beendet.")
        try:
            app.run_sync("start")
            while True:
                time.sleep(1)
        except KeyboardInterrupt:
            pass
        finally:
            app.stop()
        return 0
    from .tray import run_tray
    run_tray(app, cfg.site_url)
    return 0


if __name__ == "__main__":
    sys.exit(main())
