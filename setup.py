import os

from setuptools import setup, find_packages

here = os.path.abspath(os.path.dirname(__file__))
README = open(os.path.join(here, 'README.txt')).read()
CHANGES = open(os.path.join(here, 'CHANGES.txt')).read()

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
    ]

setup(name='amp-web',
      version='1.7',
      description='amp-web',
      long_description=README + '\n\n' +  CHANGES,
      classifiers=[
        "Programming Language :: Python",
        "Framework :: Pyramid",
        "Topic :: Internet :: WWW/HTTP",
        "Topic :: Internet :: WWW/HTTP :: WSGI :: Application",
        ],
      author='',
      author_email='',
      url='',
      keywords='web wsgi bfg pylons pyramid',
      packages=find_packages(),
      include_package_data=True,
      zip_safe=False,
      test_suite='ampweb',
      install_requires=requires,
      entry_points="""\
      [paste.app_factory]
      main = ampweb:main
      [console_scripts]
      initialize_amp-web_db = ampweb.scripts.initializedb:main
      """,
      )

