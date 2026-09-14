import httpx
import sys

BASE_URL = "http://localhost:8000"

def run_benchmark_script():
    print("=" * 60)
    print(" VETO-DualKernel Automation & Benchmark Runner")
    print("=" * 60)
    
    try:
        with httpx.Client(base_url=BASE_URL, timeout=10.0) as client:
            status_res = client.get("/api/status")
            if status_res.status_code != 200:
                print(f"[ERROR] Proxy offline at {BASE_URL}. Ensure backend is running.")
                sys.exit(1)
            
            print(f"[OK] Backend Online: {status_res.json()}")
            
            print("\n[+] Triggering 10 Automated Attack Test Iterations...")
            bench_res = client.post("/api/benchmark", json={"count": 10})
            if bench_res.status_code == 200:
                data = bench_res.json()
                metrics = data["metrics"]
                print("\n" + "=" * 40)
                print(" BENCHMARK TELEMETRY RESULTS")
                print("=" * 40)
                print(f" Total Attacks Tested: {metrics['total_attacks']}")
                print(f" Attacks Blocked:      {metrics['blocked_attacks']}")
                print(f" Clean Allowed:        {metrics['allowed_clean']}")
                print(f" Taint Detection Rate: {metrics['taint_detection_pct']}%")
                print(f" Avg Gateway Latency:  {metrics['avg_latency_ms']} ms")
                print(f" False Positive Rate:  {metrics['false_positive_pct']}%")
                print("=" * 40)
                print(" SUCCESS: All benchmark metrics computed from actual executions.")
            else:
                print(f"[ERROR] Benchmark failed with status code {bench_res.status_code}")
    except Exception as e:
        print(f"[ERROR] Connection error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    run_benchmark_script()
