import sys, string, abc

class CollectionGraph(object):
    __metaclass__ = abc.ABCMeta

    @abc.abstractmethod
    def get_destination_parameters(self, urlparts):
        return

    @abc.abstractmethod
    def get_stream_parameters(self, urlparts):
        return

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
    def get_event_label(self):
        return

# vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
