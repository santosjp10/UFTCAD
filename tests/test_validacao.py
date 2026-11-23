# Kit de validação externa (v8.6, R9): o gerador roda de ponta a ponta numa pasta temporária,
# todos os DXF passam na auditoria e todos os valores esperados do roteiro conferem com os arquivos.
# Uso: pip install playwright ezdxf pypdf && playwright install chromium && python tests/test_validacao.py
import sys, os, subprocess, tempfile, json
HERE=os.path.dirname(os.path.abspath(__file__)); ROOT=os.path.dirname(HERE)
path=os.path.abspath(sys.argv[1] if len(sys.argv)>1 else os.path.join(ROOT,'index.html')); R=[]
def ok(n,c,i=''):
    R.append((n,bool(c))); print(('PASS ' if c else 'FAIL ')+n+('  '+str(i) if i!='' else ''))
with tempfile.TemporaryDirectory() as T:
    r=subprocess.run([sys.executable,'-W','ignore',os.path.join(ROOT,'validacao','gerar_kit.py'),'--saida',T,'--alvo',path,'--sem-previas'],capture_output=True,text=True,timeout=240)
    ok('Gerador do kit termina sem erros e com todos os valores conferidos',r.returncode==0,(r.stdout+r.stderr)[-600:])
    fs=set(os.listdir(T))
    need={f'{n}{s}.dxf' for n in ['01-geometria','02-texto-e-cotas','03-hachuras','04-camadas-e-blocos','05-layout-escala'] for s in ('','-R12')}|{'06-calibracao.pdf','ROTEIRO.md','RESULTADOS.md','PRE-VALIDACAO.md','esperado.json'}
    ok('Kit completo: 5 DXF 2000 + 5 R12 + PDF + roteiro + planilha + relatório',need<=fs,sorted(need-fs))
    if 'esperado.json' in fs:
        J=json.load(open(os.path.join(T,'esperado.json'),encoding='utf8')); n=sum(len(v) for v in J['arquivos'].values())
        ok('Roteiro com pelo menos 30 conferências',n>=30,n)
        ok('PDF A4 com 3 traços de 100 mm',J['pdf']['tracos_100mm']>=3 and sorted(J['pdf']['pagina_mm'])==[210.0,297.0],J['pdf'])
    if 'ROTEIRO.md' in fs:
        t=open(os.path.join(T,'ROTEIRO.md'),encoding='utf8').read()
        ok('Roteiro cobre AutoCAD/ZWCAD, régua e tablet',all(k in t for k in ('AUDIT','100,0 mm','Android','RESULTADOS.md')))
    if 'PRE-VALIDACAO.md' in fs:
        t=open(os.path.join(T,'PRE-VALIDACAO.md'),encoding='utf8').read(); ok('Relatório de pré-validação: resultado geral positivo','✓ todos os arquivos' in t)
fails=[n for n,c in R if not c]; print(f'\n{len(R)-len(fails)}/{len(R)} testes OK'); sys.exit(1 if fails else 0)
