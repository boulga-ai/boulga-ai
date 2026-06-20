import json


def sse_event(data: dict) -> str:
    """Formate un dict en événement SSE standard : data: {json}\n\n"""
    return f"data: {json.dumps(data, ensure_ascii=False)}\n\n"
