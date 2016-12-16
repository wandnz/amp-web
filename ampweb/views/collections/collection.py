import abc

class CollectionGraph(object):
    __metaclass__ = abc.ABCMeta

    @abc.abstractmethod
    def format_data(self, data):
        return

    @abc.abstractmethod
    def get_collection_name(self):
        return

    @abc.abstractmethod
    def get_default_title(self):
        return

    @abc.abstractmethod
    def get_event_label(self, streamprops):
        return

    def get_minimum_binsize(self, request):
        settings = request.registry.settings

        if self.minbin_option in settings:
            return int(settings[self.minbin_option])

        return None

    def get_event_graphstyle(self):
        return self.get_collection_name()

    def get_matrix_data_collection(self):
        return self.get_collection_name()

    def get_selection_options(self, ampy, selected, term, page):
        return ampy.get_selection_options(self.get_collection_name(), \
                selected, term, page)

# vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
