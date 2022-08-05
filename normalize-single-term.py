import sys

from parmenides.conf import settings
from parmenides.document import Document, Section
from parmenides.extract import Extractor
from parmenides.utils import (cleanup, import_class,
        import_function, init)
from tqdm import tqdm

class SingleExtractor(Extractor):
    def extract(self, tree):
        yield tree

class SimpleParser:
    def __init__(self, tree=False):
        default_settings = {
            'EXTRACTOR': SingleExtractor,
            'en_core_web_sm': 'en_core_web_trf',
        }
        self.settings = default_settings
        init(dictionary=default_settings)
        self.processor = import_class(settings.PROCESSOR)()

    def __call__(self, text):
        results = self.parse(text)
        for result in results:
            if result is None:
                continue
            yield result

    def parse(self, text):
        document = Document(
            identifier=None,
            title=None,
            sections=[Section('Main', text)],
            collections=['parmenides'],
        )
        return self.processor.process(document)

    def parse_sentence(self, text):
        return next(self.parse(text))

tempParse = SimpleParser()
print(tempParse.parse_sentence(sys.argv[1]).term)