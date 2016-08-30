import os

from setuptools import setup, find_packages

here = os.path.abspath(os.path.dirname(__file__))
README = open(os.path.join(here, 'README.txt')).read()
CHANGES = open(os.path.join(here, 'CHANGES.txt')).read()

requires = [
    'pyramid_chameleon',
    'pyramid>=1.5.1',
    'transaction',
    'pyramid_tm',
    'pyramid_debugtoolbar',
    'pyramid_assetviews',
    'waitress',
    'PyYAML',
    ]

setup(name='amp-web',
      version='1.4',
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

