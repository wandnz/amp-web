#
# This file is part of amp-web.
#
# Copyright (C) 2013-2017 The University of Waikato, Hamilton, New Zealand.
#
# Authors: Shane Alcock
#          Brendon Jones
#
# All rights reserved.
#
# This code has been developed by the WAND Network Research Group at the
# University of Waikato. For further information please see
# http://www.wand.net.nz/
#
# amp-web is free software; you can redistribute it and/or modify
# it under the terms of the GNU General Public License version 2 as
# published by the Free Software Foundation.
#
# amp-web is distributed in the hope that it will be useful, but
# WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
# General Public License for more details.
#
# You should have received a copy of the GNU General Public License
# along with amp-web; if not, write to the Free Software Foundation, Inc.
# 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
#
# Please report any bugs, questions or comments to contact@wand.net.nz
#

from setuptools import setup, find_packages

requires = [
    'pyramid_chameleon>=0.3',
    'pyramid>=1.5.1',
    'transaction>=1.1.1',
    'pyramid_tm>=0.5',
    'pyramid_debugtoolbar',
    'pyramid_assetviews>=1.0a3',
    'waitress>=0.8.9',
    'PyYAML>=3.10',
    "zope.interface>=4.2.0",
    "zope.sqlalchemy>=0.6.1",
    "ampy>=2.7",
    "Mako>=0.8",
    "bcrypt>=2.0.0",
    ]

setup(name='amp-web',
      version='1.14',
      description='Web interface for exploring data stored in nntsc',
      classifiers=[
        "Programming Language :: Python",
        "Framework :: Pyramid",
        "Topic :: Internet :: WWW/HTTP",
        "Topic :: Internet :: WWW/HTTP :: WSGI :: Application",
        ],
      author='Shane Alcock, Brendon Jones',
      author_email='contact@wand.net.nz',
      url='http://www.wand.net.nz',
      keywords='web wsgi bfg pylons pyramid',
      packages=find_packages(),
      include_package_data=True,
      zip_safe=False,
      test_suite='ampweb',
      install_requires=requires,
      entry_points="""\
      [paste.app_factory]
      main = ampweb:main
      """,
      )

