#!/usr/bin/env python3
"""Spray log: `log <reason>`, `amend <reason>`, `summary`."""
import json, os, sys, glob, subprocess, datetime, collections

LOG = os.path.expanduser("~/.claude/spray-log.jsonl")
HERE = os.path.dirname(os.path.abspath(__file__))
SOUND = os.path.join(HERE, "..", "sounds", "psssht.wav")


def recent_actions(limit=6):
    """Last few tool calls + last assistant text from the newest transcript."""
    files = glob.glob(os.path.expanduser("~/.claude/projects/*/*.jsonl"))
    if not files:
        return ""
    newest = max(files, key=os.path.getmtime)
    tools, text, seen = [], "", set()
    try:
        with open(newest, encoding="utf-8") as f:
            lines = f.readlines()[-400:]
    except OSError:
        return ""
    for line in lines:
        try:
            m = json.loads(line).get("message") or {}
        except ValueError:
            continue
        if m.get("role") != "assistant" or not isinstance(m.get("content"), list):
            continue
        for b in m["content"]:
            if b.get("type") == "tool_use" and b.get("id") not in seen:
                seen.add(b.get("id"))
                inp = b.get("input") or {}
                hint = inp.get("description") or inp.get("file_path") or inp.get("command") or inp.get("pattern") or ""
                tools.append(f"{b.get('name')}({str(hint)[:70]})")
            elif b.get("type") == "text" and b.get("text", "").strip():
                text = b["text"].strip().replace("\n", " ")
    parts = []
    if tools:
        parts.append("tools: " + ", ".join(tools[-limit:]))
    if text:
        parts.append("last said: " + text[:160])
    return " | ".join(parts)


def load():
    if not os.path.exists(LOG):
        return []
    out = []
    with open(LOG, encoding="utf-8") as f:
        for line in f:
            try:
                out.append(json.loads(line))
            except ValueError:
                pass
    return out


def cmd_log(reason):
    reason = reason.strip()
    if os.path.exists(SOUND) and not os.environ.get("SPRAY_SILENT"):
        try:
            subprocess.Popen(["afplay", SOUND], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, start_new_session=True)
        except OSError:
            pass
    doing = recent_actions()
    entry = {
        "ts": datetime.datetime.now().astimezone().isoformat(timespec="seconds"),
        "reason": reason or None,
        "inferred": False,
        "doing": doing,
        "cwd": os.getcwd(),
    }
    os.makedirs(os.path.dirname(LOG), exist_ok=True)
    with open(LOG, "a", encoding="utf-8") as f:
        f.write(json.dumps(entry) + "\n")
    n = len(load())
    print(f"[spray #{n} logged to {LOG}]")
    print(f"Recent actions before the spray: {doing or '(none found)'}")
    if not reason:
        print(f'Record inferred reason with: python3 "{os.path.abspath(__file__)}" amend "<reason>"')


def cmd_amend(reason):
    rows = load()
    if not rows:
        return print("no sprays to amend")
    rows[-1]["reason"] = reason.strip()
    rows[-1]["inferred"] = True
    with open(LOG, "w", encoding="utf-8") as f:
        f.writelines(json.dumps(r) + "\n" for r in rows)
    print(f"spray #{len(rows)} reason: {reason.strip()}")


def cmd_summary():
    rows = load()
    if not rows:
        return
    counts = collections.Counter((r.get("reason") or "unspecified").strip().lower() for r in rows)
    top = "; ".join(f"{n}x for {r}" for r, n in counts.most_common(6))
    last = rows[-1]
    print(f"Spray-bottle history: the user has sprayed you {len(rows)}x across sessions. Sprayed {top}.")
    print(f"Most recent ({last.get('ts')}): {last.get('reason') or 'unspecified'}.")
    print("Avoid repeating these behaviours.")


if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else "summary"
    arg = " ".join(sys.argv[2:])
    {"log": lambda: cmd_log(arg), "amend": lambda: cmd_amend(arg), "summary": cmd_summary}.get(cmd, cmd_summary)()
