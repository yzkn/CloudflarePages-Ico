#!/usr/bin/python3
# -*- coding: utf-8 -*-
#
# Copyright (c) 2023 YA-androidapp(https://github.com/YA-androidapp) All rights reserved.

# sudo apt-get install libcairo2-dev
# python -m  pip install cairosvg


import cairosvg
import glob
import os
import sys


dirs = [
    '_src'
]


def main():
    for d in dirs:
        for file in glob.glob(os.path.join(d, os.path.join('**', '*.svg')), recursive=True):
            name = file.split('.svg')[0]
            print(name)
            url = name + '.svg'
            write_to = name + '.png'

            cairosvg.svg2png(
                url=url,
                write_to=write_to,
                output_width=512,
                output_height=512
            )

if __name__ == "__main__":
    main()