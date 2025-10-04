import os
import requests
import time

def ping_url(url, max_retries, retry_interval):
    trials = 0

    while trials < max_retries:
      try:
          response = requests.get(url)
          if response.status_code == 200:
            print(f"URL {url} is reachable with status code {response.status_code}")
            return True
      except requests.ConnectionError as e:
          print(f"Connection error url{url}: Retrying in {retry_interval} seconds...")
          time.sleep(retry_interval)
          trials += 1
      except requests.exceptions.MissingSchema as e:
          print(f"Invalid URL schema: {e}. Please check the URL format.")
          return False
    return False

def run():
    web_url = os.getenv("INPUT_URL")
    max_retries = int(os.getenv("INPUT_MAX_RETRIES"))
    retry_interval = int(os.getenv("INPUT_RETRY_INTERVAL"))
    websi_reachable = ping_url(web_url, max_retries, retry_interval)

    if not websi_reachable:
        raise Exception(f"Website {web_url} is malformed or unreachable after {max_retries} attempts.")

    print(f"Website {web_url} is reachable.")

if __name__ == "__main__":
    run()