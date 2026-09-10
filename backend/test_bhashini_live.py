"""
Bhashini Live Integration Verification Script for ORCA Marine AI.

Run this script to verify that your Bhashini API keys are active and working:
    python backend/test_bhashini_live.py
"""
import os
import sys
import json
import httpx
from dotenv import load_dotenv

# Load backend .env
backend_dir = os.path.dirname(os.path.abspath(__file__))
env_path = os.path.join(backend_dir, ".env")
load_dotenv(env_path)

def test_bhashini():
    print("=" * 70)
    print("ORCA Marine AI - Bhashini Service Integration Diagnostic")
    print("=" * 70)

    user_id = os.getenv("BHASHINI_USER_ID", "").strip()
    api_key = os.getenv("BHASHINI_API_KEY", "").strip() or os.getenv("ULCA_API_KEY", "").strip()
    inference_key = os.getenv("BHASHINI_INFERENCE_API_KEY", "").strip()
    pipeline_id = os.getenv("BHASHINI_PIPELINE_ID", "64392f96daac500b55c543d6").strip()

    print(f"\n[1] Environment Credentials Check:")
    print(f"  • BHASHINI_USER_ID:           {user_id[:6] + '...' + user_id[-4:] if len(user_id) > 10 else (user_id or '[MISSING]')}")
    print(f"  • BHASHINI_API_KEY (UDYAT):   {'[CONFIGURED]' if api_key else '[MISSING]'}")
    print(f"  • BHASHINI_INFERENCE_API_KEY: {'[CONFIGURED]' if inference_key else '[MISSING]'}")
    print(f"  • BHASHINI_PIPELINE_ID:       {pipeline_id}")

    if not (api_key or inference_key):
        print("\n❌ Error: Neither BHASHINI_API_KEY nor BHASHINI_INFERENCE_API_KEY is configured.")
        print("Please copy your credentials from the Bhashini Dashboard into backend/.env:")
        print("  BHASHINI_USER_ID=403364b33d6344f39bebc6cda04d38b0")
        print("  BHASHINI_API_KEY=<Paste UDYAT KEY from dashboard>")
        print("  BHASHINI_INFERENCE_API_KEY=<Paste INFERENCE KEY from dashboard>")
        sys.exit(1)

    # Test Step 1: Pipeline Discovery (MeitY ULCA getModelsPipeline)
    callback_url = "https://dhruva-api.bhashini.gov.in/services/inference/pipeline"
    service_id = "ai4bharat/indictrans-v2-all-gpu--t4"
    auth_header_name = "Authorization"
    auth_header_val = inference_key or api_key

    print(f"\n[2] Testing Pipeline Configuration Endpoint (getModelsPipeline)...")
    if user_id and api_key:
        config_url = "https://meity-auth.ulcacontrib.org/ulca/apis/v0/model/getModelsPipeline"
        headers = {
            "userID": user_id,
            "ulcaApiKey": api_key,
            "Content-Type": "application/json",
        }
        payload = {
            "pipelineTasks": [
                {
                    "taskType": "translation",
                    "config": {
                        "language": {
                            "sourceLanguage": "en",
                            "targetLanguage": "gu",
                        }
                    },
                }
            ],
            "pipelineRequestConfig": {
                "pipelineId": pipeline_id,
            },
        }

        try:
            with httpx.Client(timeout=10.0) as client:
                res = client.post(config_url, headers=headers, json=payload)
                print(f"  Response Status: {res.status_code}")
                if res.status_code == 200:
                    data = res.json()
                    ep = data.get("pipelineInferenceAPIEndPoint", {})
                    if ep.get("callbackUrl"):
                        callback_url = ep["callbackUrl"]
                    inf_auth = ep.get("inferenceApiKey", {})
                    if inf_auth.get("value"):
                        auth_header_val = inf_auth["value"]
                        auth_header_name = inf_auth.get("name", "Authorization")
                    
                    tasks = data.get("pipelineResponseConfig", [])
                    if tasks and "config" in tasks[0] and tasks[0]["config"]:
                        service_id = tasks[0]["config"][0].get("serviceId", service_id)

                    print("  ✅ Successfully negotiated model pipeline configuration!")
                    print(f"  • Service ID resolved: {service_id}")
                    print(f"  • Inference Endpoint:  {callback_url}")
                else:
                    print(f"  ⚠️ Pipeline config returned {res.status_code}: {res.text[:200]}")
                    print("  Falling back to direct Dhruva inference endpoint with provided inference key...")
        except Exception as e:
            print(f"  ⚠️ Pipeline config request failed ({e}). Falling back to direct Dhruva compute...")
    else:
        print("  ℹ️ User ID or Udyat API Key not set. Using direct Dhruva inference with INFERENCE key...")

    # Test Step 2: Direct Compute Inference Call
    print(f"\n[3] Testing Live Translation Inference (English -> Gujarati)...")
    test_phrase = "Conditions are SAFE for navigation and fishing."
    print(f"  Input Text: \"{test_phrase}\"")

    compute_headers = {
        auth_header_name: auth_header_val,
        "Content-Type": "application/json",
    }
    compute_payload = {
        "pipelineTasks": [
            {
                "taskType": "translation",
                "config": {
                    "language": {
                        "sourceLanguage": "en",
                        "targetLanguage": "gu",
                    },
                    "serviceId": service_id,
                },
            }
        ],
        "inputData": {
            "input": [{"source": test_phrase}]
        },
    }

    try:
        with httpx.Client(timeout=15.0) as client:
            resp = client.post(callback_url, headers=compute_headers, json=compute_payload)
            print(f"  Response Status: {resp.status_code}")
            if resp.status_code == 200:
                data = resp.json()
                pipeline_res = data.get("pipelineResponse", [])
                if pipeline_res and "output" in pipeline_res[0]:
                    translated = pipeline_res[0]["output"][0].get("target")
                    print("\n" + "=" * 70)
                    print("🎉 SUCCESS! Bhashini Live API is working perfectly!")
                    print("=" * 70)
                    print(f"Original Text (en):   {test_phrase}")
                    print(f"Translated Text (gu): {translated}")
                    print(f"Service ID:           {service_id}")
                    print("=" * 70)
                    return True
                else:
                    print(f"  ❌ Response format unexpected: {data}")
            else:
                print(f"  ❌ Inference returned status {resp.status_code}: {resp.text}")
    except Exception as e:
        print(f"  ❌ Inference request failed: {e}")

    return False

if __name__ == "__main__":
    test_bhashini()
