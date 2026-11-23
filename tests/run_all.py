#!/usr/bin/env python3
"""Roda todas as baterias de testes do EduCAD e mostra um resumo.

Uso:
  python tests/run_all.py                         testa o index.html (arquivo único)
  python tests/run_all.py --alvo src/dev.html     testa a versão modular
  python tests/run_all.py --somente test_fillet   roda só as baterias indicadas
"""
import os, sys, glob, subprocess, time, re

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
args = sys.argv[1:]
alvo = os.path.join(ROOT, 'index.html')
somente = []
if '--alvo' in args:
    alvo = os.path.abspath(os.path.join(ROOT, args[args.index('--alvo') + 1]))
if '--somente' in args:
    somente = args[args.index('--somente') + 1:]
    somente = [s for s in somente if not s.startswith('--')]

arquivos = sorted(glob.glob(os.path.join(HERE, 'test_*.py')))
if somente:
    arquivos = [a for a in arquivos if os.path.splitext(os.path.basename(a))[0] in somente]

total_ok = total = 0
falhas = []
print('Alvo:', os.path.relpath(alvo, ROOT))
for a in arquivos:
    nome = os.path.basename(a)
    t0 = time.time()
    r = subprocess.run([sys.executable, a, alvo], capture_output=True, text=True)
    m = re.search(r'(\d+)/(\d+) testes OK', r.stdout)
    ok, n = (int(m.group(1)), int(m.group(2))) if m else (0, 0)
    total_ok += ok; total += n
    estado = 'OK ' if r.returncode == 0 and m else 'FALHOU'
    print('%-7s %-26s %3d/%-3d  %5.1fs' % (estado, nome, ok, n, time.time() - t0))
    if estado != 'OK ':
        falhas.append(nome)
        print('\n'.join('   ' + l for l in (r.stdout + r.stderr).splitlines() if l.startswith('FAIL') or 'Error' in l or 'Traceback' in l)[:4000])
print('-' * 52)
print('Total: %d/%d testes OK' % (total_ok, total))
sys.exit(1 if falhas else 0)
