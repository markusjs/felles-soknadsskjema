#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Laster ned kristiania.no-assetene en lagret studieside bruker, og skriver om
referansene til lokale filer.

De fleste sidene i studier/ og enkeltemner/ er lagret uten assets: ikonspriten,
JS/CSS-bundlene, fontene og bildene hentes fra www.kristiania.no hver gang siden
åpnes. Det er derfor de bruker lang tid på å laste. Sidene som alt har en
_files-mappe laster raskt, og dette skriptet gjør det samme for de andre.

    python3 verktoy/lokaliser_side.py "studier/Computer Arts - Bachelor _ Kristiania.html"
    python3 verktoy/lokaliser_side.py studier/*.html enkeltemner/*.html
    python3 verktoy/lokaliser_side.py --uten-bilder studier/*.html

Bare assets hentes – lenker til vanlige sider på kristiania.no blir stående, så
navigasjonen er uendret. Skriptet er trygt å kjøre flere ganger: filer som alt
ligger der hoppes over, og en URL som ikke svarer blir stående eksternt.
"""

import hashlib
import os
import re
import subprocess
import sys
import urllib.parse

URL_RE = re.compile(r'https://www\.kristiania\.no/[^"\'\s)<>\\]+')

# Bare det som faktisk er en fil regnes som asset – vanlige sidelenker
# (https://www.kristiania.no/studier/...) skal stå urørt.
ASSET_MAPPER = ('/dist/', '/contentassets/', '/globalassets/', '/media/', '/siteassets/')
ASSET_ENDELSER = ('.js', '.css', '.svg', '.woff', '.woff2', '.ttf', '.eot', '.ico',
                  '.jpg', '.jpeg', '.png', '.gif', '.webp', '.avif', '.mp4', '.webm')
BILDE_ENDELSER = ('.jpg', '.jpeg', '.png', '.gif', '.webp', '.avif', '.mp4', '.webm')

UA = ('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 '
      '(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36')
TIDSAVBRUDD = 20
MAKS_FEIL_PAA_RAD = 8


def er_asset(url):
    sti = urllib.parse.urlsplit(url).path.lower()
    if sti.endswith(ASSET_ENDELSER):
        return True
    return any(m in sti for m in ASSET_MAPPER)


def er_bilde(url):
    return urllib.parse.urlsplit(url).path.lower().endswith(BILDE_ENDELSER)


def trygt_filnavn(url):
    """Filnavn fra URL-en, med en kort hash så to like navn ikke kolliderer."""
    sti = urllib.parse.urlsplit(url).path
    navn = os.path.basename(sti) or 'fil'
    navn = re.sub(r'[^A-Za-z0-9._-]', '_', urllib.parse.unquote(navn))[:80]
    kort = hashlib.sha1(url.encode('utf-8')).hexdigest()[:8]
    rot, ext = os.path.splitext(navn)
    return rot + '.' + kort + (ext or '')


def last_ned(url, mal):
    """curl kommer gjennom der Python-klienten blir stående og vente."""
    if os.path.exists(mal) and os.path.getsize(mal) > 0:
        return True
    kommando = ['curl', '-sS', '-L', '--compressed', '--fail',
                '--max-time', str(TIDSAVBRUDD),
                '-H', 'User-Agent: ' + UA,
                '-H', 'Accept: */*',
                '-H', 'Referer: https://www.kristiania.no/',
                '-o', mal, url]
    try:
        res = subprocess.run(kommando, capture_output=True, timeout=TIDSAVBRUDD + 10)
    except (subprocess.TimeoutExpired, OSError) as e:
        print('    kunne ikke hente %s (%s)' % (os.path.basename(mal)[:48], e))
        return False
    if res.returncode != 0:
        if os.path.exists(mal):
            os.remove(mal)
        feil = (res.stderr or b'').decode('utf-8', 'replace').strip().splitlines()
        print('    kunne ikke hente %s (%s)'
              % (os.path.basename(mal)[:48], feil[-1][:60] if feil else 'curl ' + str(res.returncode)))
        return False
    return os.path.exists(mal) and os.path.getsize(mal) > 0


def lokaliser(htmlsti, ta_med_bilder=True, teller=None):
    if not os.path.isfile(htmlsti):
        print('fant ikke %s' % htmlsti)
        return
    with open(htmlsti, encoding='utf-8') as f:
        html = f.read()

    mappe = os.path.splitext(htmlsti)[0] + '_files'
    mappenavn = os.path.basename(mappe)

    # Fragmentet (#sprite-globe) hører til referansen, ikke til filen.
    urler = {}
    for treff in URL_RE.findall(html):
        ren = treff.split('#')[0].rstrip('&')
        if not er_asset(ren):
            continue                      # vanlig lenke til kristiania.no
        if not ta_med_bilder and er_bilde(ren):
            continue
        urler.setdefault(ren, trygt_filnavn(ren))

    if not urler:
        print('%s: ingen assets å hente' % os.path.basename(htmlsti))
        return

    print('%s: %d filer' % (os.path.basename(htmlsti), len(urler)))
    os.makedirs(mappe, exist_ok=True)

    hentet = {}
    for url, navn in sorted(urler.items()):
        if last_ned(url, os.path.join(mappe, navn)):
            hentet[url] = navn
            teller['feil_paa_rad'] = 0
        else:
            teller['feil_paa_rad'] += 1
            if teller['feil_paa_rad'] >= MAKS_FEIL_PAA_RAD:
                raise Blokkert()

    if not hentet:
        os.rmdir(mappe) if not os.listdir(mappe) else None
        return

    # Lengste URL først, ellers kan en kortere URL treffe inni en lengre.
    ny = html
    for url in sorted(hentet, key=len, reverse=True):
        ny = ny.replace(url, './' + mappenavn + '/' + hentet[url])

    if ny != html:
        with open(htmlsti, 'w', encoding='utf-8') as f:
            f.write(ny)
    igjen = len([u for u in URL_RE.findall(ny) if er_asset(u.split('#')[0])])
    print('    %d av %d filer lagret, %d asset-referanser står igjen eksternt'
          % (len(hentet), len(urler), igjen))


class Blokkert(Exception):
    pass


def main(argv):
    ta_med_bilder = True
    sider = []
    for a in argv:
        if a == '--uten-bilder':
            ta_med_bilder = False
        else:
            sider.append(a)
    if not sider:
        print(__doc__)
        return 1
    teller = {'feil_paa_rad': 0}
    for side in sider:
        try:
            lokaliser(side, ta_med_bilder, teller)
        except Blokkert:
            print('\nStoppet: %d nedlastinger på rad feilet.' % MAKS_FEIL_PAA_RAD)
            print('www.kristiania.no svarer ikke på forespørslene herfra. Prøv å')
            print('åpne https://www.kristiania.no/dist/iconsSprite.2e8abd481.svg i')
            print('nettleseren – går det, er det curl som blir avvist, og assetene')
            print('må hentes på en annen måte. Filene som alt er lastet ned er')
            print('beholdt, og sidene er uendret for det som ikke kom gjennom.')
            return 2
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
