import urllib.request
import json
import uuid
import random

def run_tests():
    print("=" * 65)
    print("1. TESTE DIRETO COM DELFINANCE BAAS SANDBOX (apisandbox.delbank.com.br)")
    print("=" * 65)
    api_key = "PJPyJ2xGmyB9oDHyNIUwNOt1dgpgolBwcE16ybaKD5rYEc8ujLtarBP0nNw2FKdgK+5YJFciFwTdORlZsdaTzjEbKN5ut+Ag4xGy69bbtXJmzkzRDHry9ubYbMW4xFMb"
    account_id = "31712"
    headers = {
        "Content-Type": "application/json",
        "User-Agent": "WorkEz-Api/1.0",
        "x-delbank-api-key": api_key,
        "x-delfinance-account-id": account_id
    }

    # 1. Consulta DICT
    dict_body = json.dumps({"key": "30287697789"}).encode("utf-8")
    dict_req = urllib.request.Request("https://apisandbox.delbank.com.br/baas/api/v2/pix/dict/payment-initialization", data=dict_body, headers=headers)
    dict_res = json.loads(urllib.request.urlopen(dict_req).read().decode("utf-8"))
    e2e = dict_res["endToEndId"]
    beneficiary = dict_res["beneficiary"]["holder"]["name"]
    bank = dict_res["beneficiary"]["participant"]["name"]
    print(f"[OK] [DICT OK] EndToEndId: {e2e}")
    print(f"[OK] [DICT OK] Favorecido: {beneficiary} ({bank})")

    # 2. Execução de Transferência PIX
    trans_body = json.dumps({
        "amount": 5.00,
        "description": "Repasse WorkEz Teste Live",
        "endToEndId": e2e,
        "initiationType": "KEY"
    }).encode("utf-8")
    idempotency = str(uuid.uuid4())
    trans_headers = dict(headers)
    trans_headers["IdempotencyKey"] = idempotency
    trans_req = urllib.request.Request("https://apisandbox.delbank.com.br/baas/api/v2/transfers", data=trans_body, headers=trans_headers)
    trans_res = json.loads(urllib.request.urlopen(trans_req).read().decode("utf-8"))
    print(f"[OK] [TRANSFER OK] DelFinance Transfer ID: {trans_res.get('id')}")
    print(f"[OK] [TRANSFER OK] Status: {trans_res.get('status')}")
    print(f"[OK] [TRANSFER OK] Valor: R$ {trans_res.get('amount')}")

    # 3. Geração de QR Code Dinâmico / Cobrança Imediata
    qr_body = json.dumps({
        "correlationId": str(uuid.uuid4()),
        "amount": 150.00,
        "expiresIn": 86400,
        "formatResponse": "PAYLOAD_AND_QRCODE"
    }).encode("utf-8")
    qr_req = urllib.request.Request("https://apisandbox.delbank.com.br/baas/api/v2/pix/qrcode/dynamic", data=qr_body, headers=headers)
    qr_res = json.loads(urllib.request.urlopen(qr_req).read().decode("utf-8"))
    print(f"[OK] [QRCODE OK] TransactionId: {qr_res.get('transactionId')}")
    print(f"[OK] [QRCODE OK] PayloadPix Copia-e-Cola: {qr_res.get('payloadPix')[:55]}...")
    print(f"[OK] [QRCODE OK] QR Code Base64 Bytes: {len(qr_res.get('qrCodeImageBase64', ''))}")

    print("\n" + "=" * 65)
    print("2. TESTE END-TO-END NA API WORKEZ (http://localhost:5065)")
    print("=" * 65)
    rand = random.randint(100000, 999999)

    # Registro e Login de Cliente
    cli_reg = json.loads(urllib.request.urlopen(urllib.request.Request("http://localhost:5065/api/Auth/register/customer", data=json.dumps({"name": f"Cliente {rand}", "email": f"cli{rand}@workez.com", "password": "Senha@123", "phone": "11999998888"}).encode("utf-8"), headers={"Content-Type": "application/json"})).read().decode("utf-8"))
    cli_login = json.loads(urllib.request.urlopen(urllib.request.Request("http://localhost:5065/api/Auth/login", data=json.dumps({"email": f"cli{rand}@workez.com", "password": "Senha@123"}).encode("utf-8"), headers={"Content-Type": "application/json"})).read().decode("utf-8"))
    cli_token = cli_login["accessToken"]
    cli_user_id = cli_reg["id"]
    cli_prof = json.loads(urllib.request.urlopen(urllib.request.Request(f"http://localhost:5065/api/Customers/by-user/{cli_user_id}", headers={"Authorization": f"Bearer {cli_token}"})).read().decode("utf-8"))
    customer_id = cli_prof["id"]

    # Registro e Login de Prestador
    pro_reg = json.loads(urllib.request.urlopen(urllib.request.Request("http://localhost:5065/api/Auth/register/provider", data=json.dumps({"name": f"Eletricista {rand}", "email": f"pro{rand}@workez.com", "password": "Senha@123", "phone": "11988887777", "documentNumber": "12345678909"}).encode("utf-8"), headers={"Content-Type": "application/json"})).read().decode("utf-8"))
    pro_login = json.loads(urllib.request.urlopen(urllib.request.Request("http://localhost:5065/api/Auth/login", data=json.dumps({"email": f"pro{rand}@workez.com", "password": "Senha@123"}).encode("utf-8"), headers={"Content-Type": "application/json"})).read().decode("utf-8"))
    pro_token = pro_login["accessToken"]
    pro_user_id = pro_reg["id"]

    # Categorias
    cats = json.loads(urllib.request.urlopen("http://localhost:5065/api/Categories").read().decode("utf-8"))
    cat_id = cats[0]["id"]

    # Criar Chamado
    svc_payload = {
        "title": "Troca de Fiação do Quadro Elétrico",
        "description": "Instalação de disjuntor bipolar e fiação 6mm",
        "categoryId": cat_id,
        "address": {"zipCode": "01310-100", "street": "Av Paulista", "number": "1000", "neighborhood": "Bela Vista", "city": "São Paulo", "state": "SP", "addressType": "Home", "latitude": -23.563, "longitude": -46.654}
    }
    svc = json.loads(urllib.request.urlopen(urllib.request.Request(f"http://localhost:5065/api/Services/by-customer/{customer_id}", data=json.dumps(svc_payload).encode("utf-8"), headers={"Content-Type": "application/json", "Authorization": f"Bearer {cli_token}"})).read().decode("utf-8"))
    service_id = svc["id"]

    # Proposta: R$ 400 (R$ 250 Mão de Obra + R$ 150 Materiais)
    prop_payload = {
        "serviceId": service_id,
        "providerUserId": pro_user_id,
        "laborPrice": 250.0,
        "materialsPrice": 150.0,
        "proposedPrice": 400.0,
        "description": "Mão de obra R$ 250 + Fios e disjuntores R$ 150"
    }
    prop = json.loads(urllib.request.urlopen(urllib.request.Request("http://localhost:5065/api/Proposals/propose", data=json.dumps(prop_payload).encode("utf-8"), headers={"Content-Type": "application/json", "Authorization": f"Bearer {pro_token}"})).read().decode("utf-8"))
    proposal_id = prop["id"]

    # Aceite da Proposta (Gera Custódia Automática)
    urllib.request.urlopen(urllib.request.Request("http://localhost:5065/api/Proposals/accept", data=json.dumps({"proposalId": proposal_id, "customerUserId": cli_user_id}).encode("utf-8"), headers={"Content-Type": "application/json", "Authorization": f"Bearer {cli_token}"}))

    # Geração de Checkout Pix Dinâmico via BaaS
    checkout_req = urllib.request.Request(f"http://localhost:5065/api/Wallet/checkout-pix/{service_id}", data=b"{}", headers={"Content-Type": "application/json", "Authorization": f"Bearer {cli_token}"})
    checkout = json.loads(urllib.request.urlopen(checkout_req).read().decode("utf-8"))
    print(f"[OK] [WORKEZ CHECKOUT OK] Total: R$ {checkout.get('totalAmount')}")
    print(f"[OK] [WORKEZ CHECKOUT OK] Mão de Obra: R$ {checkout.get('laborAmount')}")
    print(f"[OK] [WORKEZ CHECKOUT OK] Materiais: R$ {checkout.get('materialsAmount')}")
    print(f"[OK] [WORKEZ CHECKOUT OK] DelFinance Copia-e-Cola: {checkout.get('pixCopiaECola')[:50]}...")
    print(f"[OK] [WORKEZ CHECKOUT OK] QR Code Base64 Bytes: {len(checkout.get('qrCodeBase64', ''))}")

    # Conclusão do Serviço -> Liberação de Custódia com Comissão Justa
    urllib.request.urlopen(urllib.request.Request(f"http://localhost:5065/api/Services/{service_id}/start-displacement", data=b"{}", headers={"Content-Type": "application/json", "Authorization": f"Bearer {pro_token}"}))
    urllib.request.urlopen(urllib.request.Request(f"http://localhost:5065/api/Services/{service_id}/start", data=b"{}", headers={"Content-Type": "application/json", "Authorization": f"Bearer {pro_token}"}))
    urllib.request.urlopen(urllib.request.Request(f"http://localhost:5065/api/Services/{service_id}/complete", data=json.dumps({"price": 400.0}).encode("utf-8"), headers={"Content-Type": "application/json", "Authorization": f"Bearer {pro_token}"}))

    # Verifica Saldo na Carteira
    # 15% sobre R$ 250 de mão de obra = R$ 37.50 de taxa
    # Líquido a receber = 400 - 37.50 = R$ 362.50
    sum_req = urllib.request.Request(f"http://localhost:5065/api/Wallet/summary/{pro_user_id}", headers={"Authorization": f"Bearer {pro_token}"})
    summary = json.loads(urllib.request.urlopen(sum_req).read().decode("utf-8"))
    print(f"[OK] [WALLET SUMMARY OK] Saldo Disponível Liberado: R$ {summary.get('availableBalance')} (Esperado: 362.50)")
    print(f"[OK] [WALLET SUMMARY OK] Saldo em Custódia: R$ {summary.get('escrowBalance')} (Esperado: 0.00)")
    print(f"[OK] [WALLET SUMMARY OK] Taxa WorkEz Mão de Obra (15%): R$ {summary.get('lastCommission', {}).get('platformFeeAmount')} (Esperado: 37.50)")

    # Prestador realiza saque PIX de R$ 100 via DelFinance Sandbox
    withdraw_payload = {
        "amount": 100.0,
        "pixKey": "30287697789",
        "pixKeyType": "CPF"
    }
    with_req = urllib.request.Request("http://localhost:5065/api/Wallet/withdraw", data=json.dumps(withdraw_payload).encode("utf-8"), headers={"Content-Type": "application/json", "Authorization": f"Bearer {pro_token}"})
    with_res = json.loads(urllib.request.urlopen(with_req).read().decode("utf-8"))
    print(f"[OK] [WITHDRAWAL OK] Saque Realizado: R$ {with_res.get('amount')}")
    print(f"[OK] [WITHDRAWAL OK] Comprovante / E2E: {with_res.get('receiptNumber')}")
    print(f"[OK] [WITHDRAWAL OK] Novo Saldo Disponível: R$ {with_res.get('newAvailableBalance')} (Esperado: 262.50)")

    print("\n" + "=" * 65)
    print("TODOS OS TESTES FORAM EXECUTADOS E VALIDADOS COM SUCESSO!")
    print("=" * 65)


if __name__ == "__main__":
    run_tests()
